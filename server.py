from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import fontforge
import os
from io import BytesIO
import tempfile

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/process-font', methods=['POST'])
def process_font():
    try:
        # استقبال الملف والخيارات
        font_file = request.files['font']
        options = request.form.get('options', '').split(',')
        
        # حفظ مؤقت
        temp_input = tempfile.NamedTemporaryFile(delete=False, suffix='.ttf')
        font_file.save(temp_input.name)
        temp_input.close()
        
        # فتح الخط بـ FontForge
        font = fontforge.open(temp_input.name)
        
        # تطبيق التأثيرات
        for option in options:
            if option == 'bold':
                # تعريض الخط
                font.selection.all()
                font.changeWeight(50)  # زيادة الوزن
                
            elif option == 'extrabold':
                font.selection.all()
                font.changeWeight(100)
                
            elif option == 'outline':
                # تفريغ الخط
                font.selection.all()
                font.removeOverlap()
                font.simplify()
                # تحويل إلى outline
                for glyph in font.glyphs():
                    if glyph.isWorthOutputting():
                        glyph.stroke("circular", 40, "round", "round", "cleanup")
                        
            elif option == 'thin':
                # تنحيف
                font.selection.all()
                font.changeWeight(-30)
                
            elif option == 'embroidery':
                # تطريز - إضافة خط داخلي
                font.selection.all()
                for glyph in font.glyphs():
                    if glyph.isWorthOutputting():
                        # نسخ الحرف وتصغيره
                        glyph.stroke("circular", 20, "round", "round")
                        
            elif option == 'shadow':
                # ظل 3D
                font.selection.all()
                for glyph in font.glyphs():
                    if glyph.isWorthOutputting():
                        # إضافة طبقة ظل
                        pen = glyph.glyphPen()
                        glyph.transform([1, 0, 0, 1, 50, -50])  # إزاحة
        
        # تغيير اسم الخط
        font.familyname = font.familyname + " Modified"
        font.fontname = font.fontname + "_Modified"
        font.fullname = font.fullname + " Modified"
        
        # حفظ الخط المعدل
        temp_output = tempfile.NamedTemporaryFile(delete=False, suffix='.ttf')
        font.generate(temp_output.name)
        font.close()
        
        # قراءة الملف
        with open(temp_output.name, 'rb') as f:
            font_data = f.read()
        
        # حذف الملفات المؤقتة
        os.unlink(temp_input.name)
        os.unlink(temp_output.name)
        
        # إرجاع الخط المعدل
        return send_file(
            BytesIO(font_data),
            mimetype='font/ttf',
            as_attachment=True,
            download_name=f'modified_font_{"-".join(options)}.ttf'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
