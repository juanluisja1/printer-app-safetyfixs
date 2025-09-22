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

// --- Printer Endpoint (UPDATED FOR BOLD TEXT) ---
app.post('/print-label', (req, res) => {
    console.log('Received print request:', req.body);
    const data = req.body;

    if (!data.shopName || !data.dropOffType) {
        console.error('Invalid data received.');
        return res.status(400).send({ error: 'Invalid data received.' });
    }

    const PRINTER_NAME = 'D450 Printer';
    const submittedAt = new Date().toLocaleString();
    let jobsToProcess = [];

    // --- Prepare data for each label ---
    if (data.dropOffType === 'vehicle') {
        jobsToProcess.push({ type: 'vehicle', data });
    } else if (data.dropOffType === 'part') {
        const totalModules = parseInt(data.moduleCount, 10) || 0;
        if (totalModules > 0) {
            for (let i = 1; i <= totalModules; i++) {
                jobsToProcess.push({ type: 'module', data, current: i, total: totalModules });
            }
        }
        
        const hasOtherParts = (data.singleStageCount > 0 || data.dualStageCount > 0 || data.threeStageCount > 0 || data.buckleCount > 0);
        if (hasOtherParts) {
            jobsToProcess.push({ type: 'other_parts', data });
        }
    }

    // --- Generate a PDF for each job and print it ---
    jobsToProcess.forEach((job, index) => {
        const doc = new PDFDocument({
            size: [360, 360], // 5 inches x 5 inches
            margin: 36
        });

        const tempFilePath = path.join(os.tmpdir(), `label-${Date.now()}-${index}.pdf`);
        const stream = fs.createWriteStream(tempFilePath);
        doc.pipe(stream);

        // --- Build the PDF with bolding ---
        doc.font('Helvetica-Bold').fontSize(26).text(`${job.data.shopName}`, { align: 'center' });
        doc.moveDown(1);
        doc.font('Helvetica-Bold').text('Phone: ', { continued: true }).font('Helvetica-Bold').text(job.data.phoneNumber || 'N/A');
        doc.moveDown(1);
        doc.fontSize(16);
        doc.font('Helvetica-Bold').text('Date: ', { continued: true }).font('Helvetica-Bold').text(submittedAt);
        doc.fontSize(26);
        doc.moveDown();
	doc.fontSize(20);
        if (job.type === 'vehicle') {
            doc.font('Helvetica-Bold').text('Vehicle: ', { continued: true })
               .font('Helvetica-Bold').text(`${job.data.vehicleYear || ''} ${job.data.vehicleMake || ''} ${job.data.vehicleModel || ''}`);
            doc.font('Helvetica-Bold').text('Notes: ', { continued: true })
               .font('Helvetica-Bold').text(job.data.additionalNotes || 'None');
        } else if (job.type === 'module') {
            doc.font('Helvetica-Bold').text('Module: ', { continued: true })
               .font('Helvetica-Bold').text(`${job.current} of ${job.total}`);
        } else if (job.type === 'other_parts') {
            doc.font('Helvetica-Bold').text('Parts Drop-off:', { underline: true });
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold');
            if (job.data.singleStageCount > 0) doc.text(`Single Stage: ${job.data.singleStageCount}`);
            if (job.data.dualStageCount > 0) doc.text(`Dual Stage: ${job.data.dualStageCount}`);
            if (job.data.threeStageCount > 0) doc.text(`Triple Stage: ${job.data.threeStageCount}`);
            if (job.data.buckleCount > 0) doc.text(`Buckles: ${job.data.buckleCount}`);
        }

        doc.end();

        // --- Print the generated PDF ---
        stream.on('finish', () => {
            console.log(`PDF created at ${tempFilePath}. Sending to printer.`);
            const options = { printer: PRINTER_NAME };

            print(tempFilePath, options)
                .then(jobId => {
                    console.log(`Job sent to printer with ID: ${jobId}`);
                    fs.unlink(tempFilePath, () => {});
                })
                .catch(err => {
                    console.error("Error from pdf-to-printer:", err);
                    fs.unlink(tempFilePath, () => {});
                });
        });
    });

    res.status(200).send({ message: `${jobsToProcess.length} label(s) being processed for printing.` });
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Local printer app listening on http://localhost:${PORT}`);
});