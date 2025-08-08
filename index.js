// printer-app.js

// --- Dependencies ---
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os'); // Added for finding the system temp directory

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

    // --- Send Each Label to the Printer (Robust Method) ---
    labelsToPrint.forEach((label, index) => {
        // Create the temp file in the system's official temp directory
        const tempFilePath = path.join(os.tmpdir(), `print_job_${Date.now()}_${index}.txt`);

        fs.writeFile(tempFilePath, label, (writeErr) => {
            if (writeErr) {
                console.error(`Error writing temp file:`, writeErr);
                return;
            }

            const command = `print /d:"${PRINTER_NAME}" "${tempFilePath}"`;
            console.log(`Executing final command: ${command}`);

            exec(command, (error, stdout, stderr) => {
                fs.unlink(tempFilePath, (unlinkErr) => {
                    if (unlinkErr) console.error(`Error deleting temp file:`, unlinkErr);
                });

                if (error) {
                    console.error(`Error during print execution:`, error);
                    return;
                }
                console.log(`Print job sent for label ${index + 1}.`);
            });
        });
    });

    res.status(200).send({ message: `${labelsToPrint.length} label(s) sent to printer.` });
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Local printer app listening on http://localhost:${PORT}`);
});