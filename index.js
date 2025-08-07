// printer-app.js

// --- Dependencies ---
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs'); // Added for file operations
const path = require('path'); // Added for handling file paths

// --- App Initialization ---
const app = express();
const PORT = 4000; // This can be any port not in use on your local machine

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
    // The printer name for your Windows machine.
    const PRINTER_NAME = 'D450 Printer'; // <-- UPDATED PRINTER NAME

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
Notes: ${data.vehicleIssueDescription || 'None'}
------------------------------
        `;
        labelsToPrint.push(labelContent);
    } else if (data.dropOffType === 'part') {
        // Handle Modules first
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

        // Handle other parts (single stage, dual stage, etc.)
        const singleStage = parseInt(data.singleStageCount, 10) || 0;
        const dualStage = parseInt(data.dualStageCount, 10) || 0;
        const threeStage = parseInt(data.threeStageCount, 10) || 0;
        const buckles = parseInt(data.buckleCount, 10) || 0;

        let otherPartsContent = '';
        if (singleStage > 0) otherPartsContent += `Single Stage: ${singleStage}\n`;
        if (dualStage > 0) otherPartsContent += `Dual Stage: ${dualStage}\n`;
        if (threeStage > 0) otherPartsContent += `Triple Stage: ${threeStage}\n`;
        if (buckles > 0) otherPartsContent += `Buckles: ${buckles}\n`;

        // If there are any other parts, create a separate label for them
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
        // For Windows, we must write the content to a temporary file first.
        const tempFilePath = path.join(__dirname, `print_job_${Date.now()}_${index}.txt`);

        fs.writeFile(tempFilePath, label, (writeErr) => {
            if (writeErr) {
                console.error(`Error writing temp file for label ${index + 1}:`, writeErr);
                return;
            }

            // Use the Windows 'print' command. Note the /d: switch.
            const command = `print /d:"${PRINTER_NAME}" "${tempFilePath}"`;
            console.log(`Executing print command for label ${index + 1}: ${command}`);

            exec(command, (error, stdout, stderr) => {
                // Always try to delete the temp file, regardless of print success.
                fs.unlink(tempFilePath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error(`Error deleting temp file ${tempFilePath}:`, unlinkErr);
                    }
                });

                if (error) {
                    console.error(`Error printing label ${index + 1}: ${error.message}`);
                    return;
                }
                if (stderr) {
                    // stderr on the 'print' command can sometimes contain success messages.
                    console.log(`Printer message for label ${index + 1}: ${stderr}`);
                }
                console.log(`Label ${index + 1} sent to printer.`);
            });
        });
    });

    res.status(200).send({ message: `${labelsToPrint.length} label(s) sent to printer.` });
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Local printer app listening on http://localhost:${PORT}`);
});

/*
// Note for Windows:
// To find printer names, open Command Prompt and run:
wmic printer get name

// Or in PowerShell, run:
Get-Printer
*/