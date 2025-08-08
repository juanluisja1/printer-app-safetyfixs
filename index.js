// printer-app.js

// --- Dependencies ---
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs'); // Required for file operations on Windows
const path = require('path'); // Required for handling file paths on Windows

// --- App Initialization ---
const app = express();
const PORT = 4000;

// --- Middleware ---
app.use(express.json());

// --- Printer Endpoint ---
/**
 * @route   POST /print-label
 * @desc    Receives data and sends it to a specific Windows printer.
 */
app.post('/print-label', (req, res) => {
    console.log('Received print request:', req.body);
    const data = req.body;

    // --- Validate Incoming Data ---
    if (!data.shopName || !data.dropOffType) {
        console.error('Invalid data received.');
        return res.status(400).send({ error: 'Invalid data received.' });
    }

    // --- PRINTER CONFIGURATION ---
    const PRINTER_NAME = 'D450 Printer'; // Your specific Windows printer name

    // --- Format the Label Content ---
    const submittedAt = new Date().toLocaleString();
    let labelsToPrint = [];

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
                const labelContent = `
------------------------------
SafetyFix -${data.shopName}
------------------------------
Date: ${submittedAt}
Phone: ${data.phoneNumber || 'N/A'}

Module: ${i} of ${totalModules}
------------------------------
                `;
                labelsToPrint.push(labelContent);
            }
        }
        const singleStage = parseInt(data.singleStageCount, 10) || 0;
        const dualStage = parseInt(data.dualStageCount, 10) || 0;
        const threeStage = parseInt(data.threeStageCount, 10) || 0;
        const buckles = parseInt(data.buckleCount, 10) || 0;

        let otherPartsContent = '';
        if (singleStage > 0) otherPartsContent += `Single Stage: ${singleStage}\n`;
        if (dualStage > 0) otherPartsContent += `Dual Stage: ${dualStage}\n`;
        if (threeStage > 0) otherPartsContent += `Triple Stage: ${threeStage}\n`;
        if (buckles > 0) otherPartsContent += `Buckles: ${buckles}\n`;

        if (otherPartsContent) {
            const otherPartsLabel = `
------------------------------
SafetyFix - ${data.shopName}
------------------------------
Date: ${submittedAt}
Phone: ${data.phoneNumber || 'N/A'}

${otherPartsContent.trim()}
------------------------------
            `;
            labelsToPrint.push(otherPartsLabel);
        }
    }

    // --- Send Each Label to the Printer (Windows Method) ---
    labelsToPrint.forEach((label, index) => {
        // Create a unique temporary filename
        const tempFilePath = path.join(__dirname, `print_job_${Date.now()}_${index}.txt`);

        // Write the label content to the temporary file
        fs.writeFile(tempFilePath, label, (writeErr) => {
            if (writeErr) {
                console.error(`Error writing temp file for label ${index + 1}:`, writeErr);
                return;
            }

            // Use the Windows 'print' command with the /d: switch
            const command = `print /d:"${PRINTER_NAME}" "${tempFilePath}"`;
            console.log(`Executing Windows print command: ${command}`);

            exec(command, (error, stdout, stderr) => {
                // Always try to delete the temp file afterwards
                fs.unlink(tempFilePath, (unlinkErr) => {
                    if (unlinkErr) console.error(`Error deleting temp file:`, unlinkErr);
                });

                if (error) {
                    console.error(`Error printing label ${index + 1}: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.log(`Printer message for label ${index + 1}: ${stderr}`);
                }
                console.log(`Label ${index + 1} sent to Windows printer queue.`);
            });
        });
    });

    res.status(200).send({ message: `${labelsToPrint.length} label(s) sent to printer.` });
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Local printer app listening on http://localhost:${PORT}`);
});