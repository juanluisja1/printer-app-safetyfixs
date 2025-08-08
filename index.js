// printer-app.js

// --- Dependencies ---
const express = require('express');
const printer = require('printer'); // Use the native printer package

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

    // --- Send Each Label to the Printer (Native Method) ---
    try {
        labelsToPrint.forEach((label, index) => {
            console.log(`Sending label ${index + 1} to printer via native module...`);
            printer.printDirect({
                data: label, // The raw text to print
                printer: PRINTER_NAME,
                type: 'RAW', // Specifies we are sending raw text
                success: function(jobID) {
                    console.log(`Sent to printer with job ID: ${jobID}`);
                },
                error: function(err) {
                    console.error('Error from native printer module:', err);
                }
            });
        });
        res.status(200).send({ message: `${labelsToPrint.length} label(s) sent to printer.` });
    } catch (err) {
        console.error("A critical error occurred with the printer module:", err);
        res.status(500).send({ error: "Failed to print." });
    }
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Local printer app listening on http://localhost:${PORT}`);
});