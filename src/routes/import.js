/**
 * Bulk Import Routes
 * Handles bulk post import from CSV/JSON files
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { requireAuth, requireApiAuth } = require('../middleware/auth');
const importService = require('../services/import');
const { BulkImportsModel } = require('../database/accountModels');

// Apply auth middleware to all import routes
router.use(requireAuth);

/**
 * GET /admin/import
 * Display import page
 */
router.get('/', (req, res) => {
    res.render('import/index', {
        title: 'Import Posts',
        currentPage: 'import',
    });
});

/**
 * POST /admin/api/import/validate
 * API: Validate import file
 */
router.post('/api/validate', upload.single('file'), requireApiAuth, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
        }

        const validation = await importService.validateFile(req.file);

        res.json({
            success: true,
            validation,
        });
    } catch (error) {
        console.error('Error validating file:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to validate file',
        });
    }
});

/**
 * POST /admin/api/import/execute
 * API: Execute import
 */
router.post('/api/execute', requireApiAuth, async (req, res) => {
    try {
        const { posts } = req.body;

        if (!posts || !Array.isArray(posts)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid posts data',
            });
        }

        const importRecord = await importService.executeImport(req.adminUser.id, posts);

        res.json({
            success: true,
            importId: importRecord.id,
            message: 'Import started',
        });
    } catch (error) {
        console.error('Error executing import:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to execute import',
        });
    }
});

/**
 * GET /admin/api/import/:id/status
 * API: Get import status
 */
router.get('/api/:id/status', requireApiAuth, (req, res) => {
    try {
        const importRecord = BulkImportsModel.findById(req.params.id);

        if (!importRecord) {
            return res.status(404).json({
                success: false,
                message: 'Import not found',
            });
        }

        res.json({
            success: true,
            status: importRecord.status,
            total: importRecord.total_rows,
            success: importRecord.success_count,
            errors: importRecord.error_count,
        });
    } catch (error) {
        console.error('Error getting import status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get import status',
        });
    }
});

module.exports = router;
