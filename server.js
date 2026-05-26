const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();

// Replit Database
const Database = require("@replit/database");
const db = new Database();

// إعداد Multer للتحميل
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB حد أقصى
});

// Serve static files
app.use(express.static(__dirname));

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// رفع خط جديد
app.post('/upload-font', upload.single('font'), async (req, res) => {
    try {
        const fontBuffer = req.file.buffer;
        const timestamp = req.body.timestamp;
        const fontKey = `font_${timestamp}`;
        
        // حفظ في قاعدة البيانات
        await db.set(fontKey, {
            name: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            timestamp: timestamp,
            data: fontBuffer.toString('base64') // تحويل إلى base64 للتخزين
        });
        
        console.log('✅ تم حفظ الخط:', fontKey);
        
        res.json({ 
            success: true, 
            message: 'تم رفع الخط بنجاح',
            fontKey: fontKey 
        });
    } catch (error) {
        console.error('❌ خطأ في رفع الخط:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// حفظ خط معالج
app.post('/save-processed', upload.single('processedFont'), async (req, res) => {
    try {
        const fontBuffer = req.file.buffer;
        const timestamp = req.body.timestamp;
        const effects = req.body.effects;
        const processedKey = `processed_${timestamp}`;
        
        await db.set(processedKey, {
            name: req.file.originalname,
            size: req.file.size,
            effects: effects,
            timestamp: timestamp,
            data: fontBuffer.toString('base64')
        });
        
        console.log('✅ تم حفظ الخط المعالج:', processedKey);
        
        res.json({ 
            success: true, 
            message: 'تم حفظ الخط المعالج بنجاح',
            processedKey: processedKey 
        });
    } catch (error) {
        console.error('❌ خطأ في حفظ الخط المعالج:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// الحصول على قائمة الخطوط
app.get('/fonts', async (req, res) => {
    try {
        const keys = await db.list();
        const fonts = [];
        
        for (const key of keys) {
            if (key.startsWith('font_')) {
                const fontData = await db.get(key);
                fonts.push({
                    key: key,
                    name: fontData.name,
                    size: fontData.size,
                    timestamp: fontData.timestamp
                });
            }
        }
        
        res.json({ success: true, fonts: fonts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// الحصول على خط معين
app.get('/font/:key', async (req, res) => {
    try {
        const fontData = await db.get(req.params.key);
        
        if (!fontData) {
            return res.status(404).json({ success: false, error: 'الخط غير موجود' });
        }
        
        const buffer = Buffer.from(fontData.data, 'base64');
        res.set({
            'Content-Type': fontData.mimetype,
            'Content-Disposition': `attachment; filename="${fontData.name}"`
        });
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
    console.log(`📁 قاعدة البيانات: Replit Database`);
});
