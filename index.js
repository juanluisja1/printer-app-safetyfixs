// printer-app.js

// --- Dependencies ---
const express = require('express');
const fs = require('fs');
const path =require('path');
const os = require('os');
const PDFDocument = require('pdfkit');          // To create PDF documents
const { print } = require('pdf-to-printer');    // To print PDF documents

// --- App Initialization ---
const app = express();
const PORT = 4000;

// --- Middleware ---
app.use(express.json());

// --- Printer Endpoint ---
app.post('/print-label', (req, res) => {
    console.log('Received print request:', req.body);
    const data = req.body;

    if (!data.shopName || !data.dropOffType) {
        console.error('Invalid data received.');
        return res.status(400).send({ error: 'Invalid data received.' });
    }

    const PRINTER_NAME = 'D450 Printer';
    const submittedAt = new Date().toLocaleString();
    let labelsToPrint = [];

    // --- Label formatting logic (remains the same) ---
    if (data.dropOffType === 'vehicle') {
        const labelContent = `
------------------------------
SafetyFix -${data.shopName}
------------------------------
Date: ${submittedAt}
Phone: ${data.phoneNumber || 'N/A'}

Vehicle: ${data.vehicleYear || ''} ${data.vehicleMake || ''} ${data.vehicleModel || ''}
Notes: ${data.additionalNotes || 'None'}
------------------------------
        `;
        labelsToPrint.push(labelContent);
    } else if (data.dropOffType === 'part') {
        const totalModules = parseInt(data.moduleCount, 10) || 0;
        if (totalModules > 0) {
            for (let i = 1; i <= totalModules; i++) {
                labelsToPrint.push(`
------------------------------
SafetyFix -${data.shopName}
------------------------------
Date: ${submittedAt}
Phone: ${data.phoneNumber || 'N/A'}

Module: ${i} of ${totalModules}
------------------------------
                `);
            }
        }
        let otherPartsContent = '';
        const singleStage = parseInt(data.singleStageCount, 10) || 0;
        const dualStage = parseInt(data.dualStageCount, 10) || 0;
        const threeStage = parseInt(data.threeStageCount, 10) || 0;
        const buckles = parseInt(data.buckleCount, 10) || 0;
        if (singleStage > 0) otherPartsContent += `Single Stage: ${singleStage}\n`;
        if (dualStage > 0) otherPartsContent += `Dual Stage: ${dualStage}\n`;
        if (threeStage > 0) otherPartsContent += `Triple Stage: ${threeStage}\n`;
        if (buckles > 0) otherPartsContent += `Buckles: ${buckles}\n`;
        if (otherPartsContent) {
            labelsToPrint.push(`
------------------------------
SafetyFix - ${data.shopName}
------------------------------
Date: ${submittedAt}
Phone: ${data.phoneNumber || 'N/A'}

${otherPartsContent.trim()}
------------------------------
            `);
        }
    }

    // --- Generate a PDF and Print It ---
    labelsToPrint.forEach((label, index) => {
        const doc = new PDFDocument({
            size: 'A7', // A small standard size, good for labels
            margin: 20
        });

        const tempFilePath = path.join(os.tmpdir(), `label-${Date.now()}-${index}.pdf`);
        const stream = fs.createWriteStream(tempFilePath);
        doc.pipe(stream);

        // Add the label text to the PDF
        doc.font('Courier').fontSize(9).text(label);

        // Finalize the PDF
        doc.end();

        // Wait for the file to be fully written before printing
        stream.on('finish', () => {
            console.log(`PDF created at ${tempFilePath}. Sending to printer.`);
            const options = { printer: PRINTER_NAME };

            print(tempFilePath, options)
                .then(jobId => {
                    console.log(`Job sent to printer with ID: ${jobId}`);
                    // Clean up the temporary PDF file
                    fs.unlink(tempFilePath, () => {});
                })
                .catch(err => {
                    console.error("Error from pdf-to-printer:", err);
                    // Clean up the temporary PDF file
                    fs.unlink(tempFilePath, () => {});
                });
        });
    });

    res.status(200).send({ message: `${labelsToPrint.length} label(s) being processed for printing.` });
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Local printer app listening on http://localhost:${PORT}`);
});