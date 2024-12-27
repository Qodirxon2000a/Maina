const express = require('express');
const bodyParser = require('body-parser');
const printer = require('pdf-to-printer');
const cors = require('cors');
const fs = require('fs');
const PDFDocument = require('pdfkit'); // PDF yaratish uchun

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// Printerlar ro'yxatini olish
app.get('/printers', async (req, res) => {
  try {
    const printers = await printer.getPrinters();
    if (!printers || printers.length === 0) {
      return res.status(404).json({ error: 'Printerlar topilmadi!' });
    }
    res.json(printers);
  } catch (error) {
    console.error('Printerlarni olishda xatolik:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi!' });
  }
});

// Chop etish funksiyasi
app.post('/print', async (req, res) => {
  const { printer: selectedPrinter, content } = req.body;

  if (!selectedPrinter || !content) {
    return res.status(400).json({ error: 'Printer yoki content yetarli emas' });
  }

  try {
    const pdfFile = 'receipt.pdf';
    const doc = new PDFDocument({
      size: [226.77, 841.89], // 80mm kenglikdagi qog'oz uchun
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
    });

    const writeStream = fs.createWriteStream(pdfFile);
    doc.pipe(writeStream);

    // PDF mazmunini yozish
    doc.fontSize(12).font('Helvetica-Bold').text(`Chek`);
    doc.text(`Sana: ${content.dateTime}`);
    doc.text(`Ism: ${content.user?.name || 'Noma’lum'}`);
    doc.moveDown();
    doc.text('Mahsulotlar:', { underline: true });

    content.products.forEach((product) => {
      doc.text(` - ${product.name}: ${product.price} so'm`);
    });

    doc.moveDown();
    doc.text('Tanlovingiz uchun rahmat!', { align: 'center' });
    doc.end();

    writeStream.on('finish', async () => {
      try {
        // PDF chop etish
        await printer.print(pdfFile, { printer: selectedPrinter });
        fs.unlinkSync(pdfFile); // PDFni o'chirish
        res.json({ message: 'Chek muvaffaqiyatli chiqarildi!' });
      } catch (error) {
        console.error('Chop etishda xatolik:', error);
        res.status(500).json({ error: 'Chop etishda xatolik yuz berdi' });
      }
    });
  } catch (error) {
    console.error('PDF yaratishda xatolik:', error);
    res.status(500).json({ error: 'PDF yaratishda xatolik yuz berdi' });
  }
});

// Serverni ishga tushirish
app.listen(PORT, () => {
  console.log(`Server ishga tushdi: http://localhost:${PORT}`);
});
