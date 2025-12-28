/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * All rights reserved.
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const https = require('https');
const path = require('path');
const fs = require('fs');
const { URLSearchParams, URL } = require('url');
const multer = require('multer');
const textParser = require('../public/scripts/text-parser.js');

const spoilerMarker = "**spoiler**";;
const app = express();
const upload = multer();

const { initializeDatabase } = require('./database/init');
const scheduler = require('./services/scheduler');
const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth');
const accountsRouter = require('./routes/accounts');
const importRouter = require('./routes/import');
const analyticsRouter = require('./routes/analytics');
const commentsRouter = require('./routes/comments');
const { AccountsModel, AccountCookiesModel, AdminSessionsModel } = require('./database/accountModels');

const FIELD__ERROR_MESSAGE = 'error_message';
const FIELD__ID = 'id';
const FIELD__STATUS = 'status';
const FIELD__THREADS_BIOGRAPHY = 'threads_biography';
const FIELD__THREADS_PROFILE_PICTURE_URL = 'threads_profile_picture_url';
const FIELD__USERNAME = 'username';

const MEDIA_TYPE__CAROUSEL = 'CAROUSEL';
const MEDIA_TYPE__IMAGE = 'IMAGE';
const MEDIA_TYPE__TEXT = 'TEXT';
const MEDIA_TYPE__VIDEO = 'VIDEO';

const PARAMS__ACCESS_TOKEN = 'access_token';
const PARAMS__AUTO_PUBLISH_TEXT = 'auto_publish_text';
const PARAMS__CLIENT_ID = 'client_id';
const PARAMS__FIELDS = 'fields';
const PARAMS__LINK_ATTACHMENT = 'link_attachment';
const PARAMS__POLL_ATTACHMENT = 'poll_attachment';
const PARAMS__QUOTE_POST_ID = 'quote_post_id';
const PARAMS__REDIRECT_URI = 'redirect_uri';
const PARAMS__REPLY_CONTROL = 'reply_control';
const PARAMS__REPLY_TO_ID = 'reply_to_id';
const PARAMS__RESPONSE_TYPE = 'response_type';
const PARAMS__SCOPE = 'scope';
const PARAMS__TEXT = 'text';
const PARAMS__TOPIC_TAG = 'topic_tag';
const PARAMS_IS_SPOILER_MEDIA = 'is_spoiler_media';
const PARAMS_TEXT_ENTITES = 'text_entities';

// Read variables from environment
require('dotenv').config();
const {
    HOST,
    PORT,
    REDIRECT_URI,
    APP_ID,
    API_SECRET,
    GRAPH_API_VERSION,
    INITIAL_ACCESS_TOKEN,
    INITIAL_USER_ID,
    REJECT_UNAUTHORIZED,
} = process.env;
console.log(API_SECRET, APP_ID)

const agent = new https.Agent({
    rejectUnauthorized: REJECT_UNAUTHORIZED !== 'false',
});

const GRAPH_API_BASE_URL =
    'https://graph.threads.net/' +
    (GRAPH_API_VERSION ? GRAPH_API_VERSION + '/' : '');
const AUTHORIZATION_BASE_URL = 'https://www.threads.net';

let initial_access_token = INITIAL_ACCESS_TOKEN;
let initial_user_id = INITIAL_USER_ID;

// Access scopes required for the token
const SCOPES = [
    'threads_basic',
    'threads_content_publish',
    'threads_manage_insights',
    'threads_manage_replies',
    'threads_read_replies',
    'threads_keyword_search',
    'threads_manage_mentions',
    'threads_delete',
    'threads_location_tagging',
    'threads_profile_discovery',
];

app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'pug');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(methodOverride('_method'));
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 6000000,
        },
    })
);

// Auth routes must be mounted BEFORE admin routes to avoid redirect loop
app.use('/admin/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/admin/accounts', accountsRouter);
app.use('/admin/import', importRouter);
app.use('/admin/analytics', analyticsRouter);
app.use('/admin/api/comments', commentsRouter);

// Middleware to ensure the user is logged in
const loggedInUserChecker = (req, res, next) => {
    // Check session first, then cookie, then initial values
    const accessToken = req.session.access_token || req.signedCookies.access_token;

    if (accessToken) {
        req.session.access_token = accessToken; // Sync session with cookie
        next();
    } else if (initial_access_token && initial_user_id) {
        useInitialAuthenticationValues(req);
        next();
    } else {
        const returnUrl = encodeURIComponent(req.originalUrl);
        res.redirect(`/?${PARAMS__RETURN_URL}=${returnUrl}`);
    }
};

app.get('/', (req, res) => {
    // Check if admin user is logged in
    const sessionToken = req.signedCookies.admin_session;
    if (sessionToken) {
        const { AdminSessionsModel } = require('./database/accountModels');
        const session = AdminSessionsModel.findByToken(sessionToken);
        if (session && session.expires_at > Math.floor(Date.now() / 1000)) {
            return res.redirect('/admin/platforms');
        }
    }

    // Not logged in, redirect to admin login
    res.redirect('/admin/auth/login');
});

// Login route using OAuth
app.get('/login', (req, res) => {
    const url = buildGraphAPIURL(
        'oauth/authorize',
        {
            [PARAMS__SCOPE]: SCOPES.join(','),
            [PARAMS__CLIENT_ID]: APP_ID,
            [PARAMS__REDIRECT_URI]: REDIRECT_URI,
            [PARAMS__RESPONSE_TYPE]: 'code',
        },
        null,
        AUTHORIZATION_BASE_URL
    );

    console.log(url);

    res.redirect(url);
});

// Callback route for OAuth user token And reroute to '/pages'
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const uri = buildGraphAPIURL(
        'oauth/access_token',
        {},
        null,
        GRAPH_API_BASE_URL
    );

    try {
        const response = await axios.post(
            uri,
            new URLSearchParams({
                client_id: APP_ID,
                client_secret: API_SECRET,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI,
                code,
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                httpsAgent: agent,
            }
        );
        req.session.access_token = response.data.access_token;
        const extendAccessTokenUrl = buildGraphAPIURL(
            `access_token`,
            {
                grant_type: 'th_exchange_token',
                client_secret: API_SECRET,
            },
            req.session.access_token
        );
        try {
            const extendTokenResponse = await axios.get(extendAccessTokenUrl, {
                httpsAgent: agent,
            });
            req.session.access_token = extendTokenResponse.data.access_token;
        } catch (e) {
            console.error(e?.response?.data?.error?.message ?? e.message);
        }

        // Fetch user details and save account to database
        try {
            const getUserDetailsUrl = buildGraphAPIURL(
                'me',
                {
                    [PARAMS__FIELDS]: [
                        FIELD__ID,
                        FIELD__USERNAME,
                        FIELD__THREADS_PROFILE_PICTURE_URL,
                        FIELD__THREADS_BIOGRAPHY,
                    ].join(','),
                },
                req.session.access_token
            );

            const userResponse = await axios.get(getUserDetailsUrl, {
                httpsAgent: agent,
            });

            const threadsUserId = userResponse.data.id;
            const username = userResponse.data.username;

            // Check if account already exists
            let account = AccountsModel.findByThreadsUserId(threadsUserId);

            // Get logged-in admin user
            const sessionToken = req.signedCookies.admin_session;
            let adminUserId = null;
            if (sessionToken) {
                const session = AdminSessionsModel.findByToken(sessionToken);
                if (session && session.expires_at > Math.floor(Date.now() / 1000)) {
                    adminUserId = session.admin_user_id;
                }
            }

            if (account) {
                // Update existing account with new token and admin user
                account = AccountsModel.update(account.id, {
                    access_token: req.session.access_token,
                    username,
                    threads_profile_picture_url: userResponse.data.threads_profile_picture_url,
                    threads_biography: userResponse.data.threads_biography,
                    admin_user_id: adminUserId, // Link to admin user
                });
            } else {
                // Create new account linked to admin user
                account = AccountsModel.create({
                    threads_user_id: threadsUserId,
                    username,
                    threads_profile_picture_url: userResponse.data.threads_profile_picture_url,
                    threads_biography: userResponse.data.threads_biography,
                    access_token: req.session.access_token,
                    admin_user_id: adminUserId, // Link to admin user
                });
            }

            // Set as current account
            res.cookie('current_account_id', account.id, {
                signed: true,
                maxAge: 365 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
            });
        } catch (userError) {
            console.error('Error fetching user details:', userError?.response?.data?.error?.message ?? userError.message);
        }

        // Save access token to signed cookie (expires in 60 days)
        res.cookie('access_token', req.session.access_token, {
            signed: true,
            maxAge: 60 * 24 * 60 * 60 * 1000, // 60 days
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        res.redirect('/admin/platforms');
    } catch (err) {
        console.error(err?.response?.data);
        res.render('index', {
            error: `There was an error with the request: ${err}`,
        });
    }
});


app.post('/upload', upload.array(), async (req, res) => {
    const {
        text,
        attachmentType,
        attachmentUrl,
        attachmentAltText,
        replyControl,
        replyToId,
        topicTag,
        linkAttachment,
        autoPublishText,
        pollOptionA,
        pollOptionB,
        pollOptionC,
        pollOptionD,
        quotePostId,
        spoilerMedia,
    } = req.body;

    const params = {
        [PARAMS__REPLY_CONTROL]: replyControl,
        [PARAMS__REPLY_TO_ID]: replyToId,
        [PARAMS__LINK_ATTACHMENT]: linkAttachment,
    };

    if (text.includes(spoilerMarker)) {
        parsedInput = textParser.extractSpoilerInfo(text);
        processedText = parsedInput.text;
        textEntites = parsedInput.textEntities;
        params[PARAMS__TEXT] = processedText;
        params[PARAMS_TEXT_ENTITES] = JSON.stringify(textEntites);
    } else {
        params[PARAMS__TEXT] = text;
    }
    if (
        topicTag.length >= 1 &&
        topicTag.length <= 50 &&
        !topicTag.includes('.') &&
        !topicTag.includes('&')
    ) {
        params[PARAMS__TOPIC_TAG] = topicTag;
    }

    if (spoilerMedia) {
        params[PARAMS_IS_SPOILER_MEDIA] = true;
    }

    if (pollOptionA && pollOptionB) {
        const pollAttachment = JSON.stringify({
            option_a: pollOptionA,
            option_b: pollOptionB,
            option_c: pollOptionC,
            option_d: pollOptionD,
        });
        params[PARAMS__POLL_ATTACHMENT] = pollAttachment;
    }

    if (quotePostId) {
        params[PARAMS__QUOTE_POST_ID] = quotePostId;
    }

    // No attachments
    if (!attachmentType?.length) {
        params.media_type = MEDIA_TYPE__TEXT;
    }
    // Single attachment
    else if (attachmentType?.length === 1) {
        addAttachmentFields(
            params,
            attachmentType[0],
            attachmentUrl[0],
            attachmentAltText[0]
        );
    }
    // Multiple attachments
    else {
        params.media_type = MEDIA_TYPE__CAROUSEL;
        params.children = [];
        attachmentType.forEach((type, i) => {
            const child = {
                is_carousel_item: true,
            };
            addAttachmentFields(
                child,
                type,
                attachmentUrl[i],
                attachmentAltText[i]
            );
            params.children.push(child);
        });
    }

    if (autoPublishText === 'on' && params.media_type === MEDIA_TYPE__TEXT) {
        params[PARAMS__AUTO_PUBLISH_TEXT] = true;
    }

    if (params.media_type === MEDIA_TYPE__CAROUSEL) {
        const createChildPromises = params.children.map((child) =>
            axios.post(
                buildGraphAPIURL(`me/threads`, child, req.session.access_token),
                {}
            )
        );
        try {
            const createCarouselItemResponse = await Promise.all(
                createChildPromises
            );
            // Replace children with the IDs
            params.children = createCarouselItemResponse
                .filter((response) => response.status === 200)
                .map((response) => response.data.id)
                .join(',');
        } catch (e) {
            console.error(e.message);
            res.json({
                error: true,
                message: `Error creating child elements: ${e}`,
            });
            return;
        }
    }

    const postThreadsUrl = buildGraphAPIURL(
        `me/threads`,
        params,
        req.session.access_token
    );
    try {
        const postResponse = await axios.post(
            postThreadsUrl,
            {},
            { httpsAgent: agent }
        );
        const id = postResponse.data.id;
        if (
            autoPublishText === 'on' &&
            params.media_type === MEDIA_TYPE__TEXT
        ) {
            // If auto_publish_text is on, the returned ID is the published Threads ID.
            return res.json({
                redirectUrl: `/threads/${id}`,
            });
        } else {
            // Otherwise, the returned ID is the container ID.
            return res.json({
                id: id,
            });
        }
    } catch (e) {
        console.error(e.message);
        res.json({
            error: true,
            message: `Error during upload: ${e}`,
        });
    }
});

app.get('/publish/:containerId', loggedInUserChecker, async (req, res) => {
    const containerId = req.params.containerId;
    res.render('publish', {
        containerId,
        title: 'Publish',
    });
});

app.get(
    '/container/status/:containerId',
    loggedInUserChecker,
    async (req, res) => {
        const { containerId } = req.params;
        const getContainerStatusUrl = buildGraphAPIURL(
            containerId,
            {
                [PARAMS__FIELDS]: [FIELD__STATUS, FIELD__ERROR_MESSAGE].join(
                    ','
                ),
            },
            req.session.access_token
        );

        try {
            const queryResponse = await axios.get(getContainerStatusUrl, {
                httpsAgent: agent,
            });
            res.json(queryResponse.data);
        } catch (e) {
            console.error(e.message);
            res.json({
                error: true,
                message: `Error querying container status: ${e}`,
            });
        }
    }
);

app.post('/publish', upload.array(), async (req, res) => {
    const { containerId } = req.body;
    const publishThreadsUrl = buildGraphAPIURL(
        `me/threads_publish`,
        {
            creation_id: containerId,
        },
        req.session.access_token
    );

    try {
        const postResponse = await axios.post(publishThreadsUrl, {
            httpsAgent: agent,
        });
        const threadId = postResponse.data.id;
        res.json({
            id: threadId,
        });
    } catch (e) {
        console.error(e.message);
        res.json({
            error: true,
            message: `Error during publishing: ${e}`,
        });
    }
});


https
    .createServer(
        {
            key: fs.readFileSync(
                path.join(__dirname, '../' + HOST + '-key.pem')
            ),
            cert: fs.readFileSync(path.join(__dirname, '../' + HOST + '.pem')),
        },
        app
    )
    .listen(PORT, HOST, (err) => {
        if (err) {
            console.error(`Error: ${err}`);
        }
        console.log(`listening on port ${PORT}!`);

        // Start the post scheduler
        scheduler.initialize();
    });

/**
 * @param {string} path
 * @param {URLSearchParams} searchParams
 * @param {string} accessToken
 * @param {string} base_url
 */
function buildGraphAPIURL(path, searchParams, accessToken, base_url) {
    const url = new URL(path, base_url ?? GRAPH_API_BASE_URL);

    url.search = new URLSearchParams(searchParams);
    if (accessToken) {
        url.searchParams.append(PARAMS__ACCESS_TOKEN, accessToken);
    }

    return url.toString();
}
/**
 * @param {Request} req
 */
function useInitialAuthenticationValues(req) {
    // Use initial values
    req.session.access_token = initial_access_token;
    req.session.user_id = initial_user_id;
    // Clear initial values to enable signing out
    initial_access_token = undefined;
    initial_user_id = undefined;
}

/**
 * @param {object} target
 * @param {string} attachmentType
 * @param {string} url
 */
function addAttachmentFields(target, attachmentType, url, altText) {
    if (attachmentType === 'Image') {
        target.media_type = MEDIA_TYPE__IMAGE;
        target.image_url = url;
        target.alt_text = altText;
    } else if (attachmentType === 'Video') {
        target.media_type = MEDIA_TYPE__VIDEO;
        target.video_url = url;
        target.alt_text = altText;
    }
}
