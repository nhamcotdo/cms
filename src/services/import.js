/**
 * Bulk Import Service
 * Handles parsing and importing posts from CSV/JSON files
 */

const csv = require('csv-parser');
const { Readable } = require('stream');
const { ScheduledPostsModel, POST_STATUS } = require('../database/models');
const { BulkImportsModel } = require('../database/accountModels');

const MEDIA_TYPES = ['TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL'];
const REPLY_CONTROLS = ['', 'mentioned_only', 'followers_only'];
const MAX_IMPORT_POSTS = 100;

/**
 * Validate uploaded file
 */
async function validateFile(file) {
    const extension = file.originalname.split('.').pop().toLowerCase();
    const content = file.buffer.toString();

    let posts = [];
    let errors = [];

    if (extension === 'json') {
        const result = validateJSON(content);
        posts = result.posts;
        errors = result.errors;
    } else if (extension === 'csv') {
        const result = await validateCSV(content);
        posts = result.posts;
        errors = result.errors;
    } else {
        throw new Error('Invalid file format. Please upload CSV or JSON file.');
    }

    // Limit to MAX_IMPORT_POSTS
    const limitedPosts = posts.slice(0, MAX_IMPORT_POSTS);

    return {
        total: posts.length,
        valid: limitedPosts.length,
        errors: errors.length,
        posts: limitedPosts,
        errorDetails: errors.slice(0, 10),
        limit: MAX_IMPORT_POSTS,
        truncated: posts.length > MAX_IMPORT_POSTS,
    };
}

/**
 * Validate JSON content
 */
function validateJSON(content) {
    const posts = [];
    const errors = [];

    try {
        const data = JSON.parse(content);

        if (!Array.isArray(data)) {
            throw new Error('JSON must contain an array of posts');
        }

        data.forEach((item, index) => {
            const result = validatePost(item, index + 1);
            if (result.valid) {
                posts.push(result.post);
            } else {
                errors.push(...result.errors);
            }
        });
    } catch (error) {
        errors.push({ line: 1, message: error.message });
    }

    return { posts, errors };
}

/**
 * Validate CSV content
 */
async function validateCSV(content) {
    const posts = [];
    const errors = [];
    let rowIndex = 0;

    return new Promise((resolve) => {
        const stream = Readable.from([content]);

        stream
            .pipe(csv())
            .on('data', (row) => {
                rowIndex++;
                const result = validatePost(row, rowIndex);
                if (result.valid) {
                    posts.push(result.post);
                } else {
                    errors.push(...result.errors);
                }
            })
            .on('end', () => {
                resolve({ posts, errors });
            })
            .on('error', (error) => {
                errors.push({ line: 1, message: error.message });
                resolve({ posts, errors });
            });
    });
}

/**
 * Validate single post data
 */
function validatePost(data, index) {
    const errors = [];
    const post = {
        text: data.text || '',
        media_type: 'TEXT',
        scheduled_for: null,
        status: POST_STATUS.DRAFT,
        reply_control: null,
        topic_tag: null,
        link_attachment: null,
    };

    // Validate text
    if (!data.text || data.text.trim().length === 0) {
        errors.push({ line: index, message: 'Text is required' });
    }

    // Validate media type
    if (data.media_type) {
        const mediaType = data.media_type.toUpperCase();
        if (!MEDIA_TYPES.includes(mediaType)) {
            errors.push({
                line: index,
                message: `Invalid media_type: ${data.media_type}. Must be one of: ${MEDIA_TYPES.join(', ')}`,
            });
        } else {
            post.media_type = mediaType;
        }
    }

    // For IMAGE/VIDEO, media_url is required
    if ((post.media_type === 'IMAGE' || post.media_type === 'VIDEO') && !data.media_url) {
        errors.push({
            line: index,
            message: `media_url is required for ${post.media_type} posts`,
        });
    }

    // Validate schedule date/time
    if (data.schedule_date && data.schedule_time) {
        const scheduledDateTime = new Date(`${data.schedule_date}T${data.schedule_time}`);
        if (isNaN(scheduledDateTime.getTime())) {
            errors.push({
                line: index,
                message: 'Invalid schedule_date or schedule_time format',
            });
        } else {
            post.scheduled_for = Math.floor(scheduledDateTime.getTime() / 1000);
            post.status = POST_STATUS.SCHEDULED;
        }
    }

    // Validate reply control
    if (data.reply_control) {
        const replyControl = data.reply_control.toLowerCase();
        if (!REPLY_CONTROLS.includes(replyControl)) {
            errors.push({
                line: index,
                message: `Invalid reply_control: ${data.reply_control}`,
            });
        } else {
            post.reply_control = replyControl;
        }
    }

    // Validate topic tag
    if (data.topic_tag) {
        post.topic_tag = data.topic_tag;
    }

    // Validate link attachment
    if (data.link_attachment) {
        try {
            new URL(data.link_attachment);
            post.link_attachment = data.link_attachment;
        } catch {
            errors.push({ line: index, message: 'Invalid link_attachment URL' });
        }
    }

    // Validate attachment URL for media posts
    if (data.media_url && post.media_type !== 'TEXT') {
        try {
            new URL(data.media_url);
            post.attachment_data = {
                attachmentType: [post.media_type === 'IMAGE' ? 'Image' : 'Video'],
                attachmentUrl: [data.media_url],
                attachmentAltText: [data.alt_text || ''],
            };
        } catch {
            errors.push({ line: index, message: 'Invalid media_url' });
        }
    }

    return {
        valid: errors.length === 0,
        post,
        errors,
    };
}

/**
 * Execute import
 */
async function executeImport(adminUserId, posts) {
    const importRecord = BulkImportsModel.create({
        admin_user_id: adminUserId,
        file_name: 'bulk_import.json',
        total_rows: posts.length,
        status: 'processing',
    });

    let successCount = 0;
    let errorCount = 0;

    for (const postData of posts) {
        try {
            ScheduledPostsModel.create(postData);
            successCount++;
        } catch (error) {
            console.error('Error importing post:', error);
            errorCount++;
        }
    }

    const finalStatus = errorCount === 0 ? 'completed' : 'completed';

    BulkImportsModel.update(importRecord.id, {
        success_count: successCount,
        error_count: errorCount,
        status: finalStatus,
    });

    return BulkImportsModel.findById(importRecord.id);
}

module.exports = {
    validateFile,
    executeImport,
};
