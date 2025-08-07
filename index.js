// printer-app.js

// --- Dependencies ---
const express = require('express');
const { exec } = require('child_process'); // Use Node's built-in exec function

// --- App Initialization ---
const app = express();
const PORT = 4000; // This can be any port not in use on your local machine

// --- Middleware ---
app.use(express.json());

// --- Printer Endpoint ---
/**
 * @route   POST /print-label
 * @desc    Receives data and sends it to the default local printer via command line.
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
    // I have selected a printer from the list you provided.
    // If this is not the correct label printer, please replace it with one of the other names from your list.
    const PRINTER_NAME = 'Brother_HL_L2395DW_series__3c2af4691380_';

    if (PRINTER_NAME === 'YOUR_PRINTER_NAME_HERE') {
        const errorMessage = "Printer name is not configured in printer-app.js";
        console.error(errorMessage);
        return res.status(500).send({ error: errorMessage });
    }

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

    // --- Send Each Label to the Printer via Command Line ---
    labelsToPrint.forEach((label, index) => {
        // Escape quotes in the label content to be safe
        const sanitizedLabel = label.replace(/"/g, '\\"');
        const command = `echo "${sanitizedLabel}" | lp -d "${PRINTER_NAME}"`;

        console.log(`Executing print command for label ${index + 1}: ${command}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error printing label ${index + 1}: ${error.message}`);
                return;
            }
            if (stderr) {
                console.warn(`Printer status message for label ${index + 1}: ${stderr}`);
            }
            console.log(`Label ${index + 1} sent to printer.`);
        });
    });

    res.status(200).send({ message: `${labelsToPrint.length} label(s) sent to printer.` });
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Local printer app listening on http://localhost:${PORT}`);
});

//note
//lpstat -p // to find default printer