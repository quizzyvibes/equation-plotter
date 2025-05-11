document.addEventListener('DOMContentLoaded', () => {
    const equationInput = document.getElementById('equation');
    const equationPreview = document.getElementById('equationPreview'); // New element
    const xminInput = document.getElementById('xmin');
    const xmaxInput = document.getElementById('xmax');
    const yminInput = document.getElementById('ymin');
    const ymaxInput = document.getElementById('ymax');
    const plotButton = document.getElementById('plotButton');
    const canvas = document.getElementById('plotCanvas');
    const errorMessagesDiv = document.getElementById('errorMessages');
    const ctx = canvas.getContext('2d');

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    let parser;
    try {
        parser = math.parser();
    } catch (e) {
        displayError("Error initializing math parser. Ensure math.js is loaded.");
        console.error(e);
        if (equationPreview) equationPreview.innerHTML = "<span style='color:red;'>Math parser init failed.</span>";
        return;
    }

    function displayError(message) {
        errorMessagesDiv.textContent = message;
    }

    function clearError() {
        errorMessagesDiv.textContent = '';
    }

    // --- Function to update KaTeX preview ---
    function updateEquationPreview() {
        if (!window.katex) { // Check if KaTeX is loaded
            if (equationPreview) equationPreview.innerHTML = "<span style='color:orange;'>KaTeX not loaded.</span>";
            return;
        }
        if (!equationPreview) return; // Ensure the element exists

        const expression = equationInput.value.trim();
        if (!expression) {
            equationPreview.innerHTML = ''; // Clear preview if input is empty
            return;
        }

        try {
            // Use math.js to parse and then convert to LaTeX
            const node = math.parse(expression);
            const latex = node.toTex(); // Convert to LaTeX string
            
            katex.render(latex, equationPreview, {
                throwOnError: false, // Don't break page on KaTeX error, show error in preview
                displayMode: false,   // false for inline, true for block display
                // you can add other KaTeX options here
            });
        } catch (mathJsError) {
            // If math.js can't parse it, try to render the raw string with KaTeX
            // This might work for simple LaTeX directly typed by the user
            try {
                katex.render(expression, equationPreview, {
                    throwOnError: false,
                    displayMode: false,
                    colorIsTextColor: true // Use current text color for errors
                });
            } catch (katexError) {
                 // Fallback if KaTeX also fails (e.g. on very malformed input)
                equationPreview.textContent = "Invalid expression for preview";
            }
        }
    }

    function plotEquation() {
        clearError();
        const equationStr = equationInput.value.trim();
        // Update the preview one last time before plotting, in case it wasn't due to input event
        updateEquationPreview(); 

        if (!equationStr) {
            displayError("Please enter an equation.");
            return;
        }
        
        let compiledEq;
        try {
            const node = math.parse(equationStr);
            compiledEq = node.compile();
        } catch (err) {
            displayError(`Error parsing equation: ${err.message}`);
            console.error(err);
            return;
        }

        // ... (rest of the plotEquation function remains the same) ...
        const xMin = parseFloat(xminInput.value);
        const xMax = parseFloat(xmaxInput.value);
        const yMin = parseFloat(yminInput.value);
        const yMax = parseFloat(ymaxInput.value);

        if (isNaN(xMin) || isNaN(xMax) || isNaN(yMin) || isNaN(yMax)) {
            displayError("Invalid range values. Please enter numbers.");
            return;
        }
        if (xMin >= xMax || yMin >= yMax) {
            displayError("Min values must be less than Max values for ranges.");
            return;
        }

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        drawAxesAndGrid(xMin, xMax, yMin, yMax);

        ctx.beginPath();
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;

        const numPoints = canvasWidth * 2; 
        const dx = (xMax - xMin) / numPoints;
        let firstPoint = true;

        for (let i = 0; i <= numPoints; i++) {
            const xMath = xMin + i * dx;
            let yMath;

            try {
                yMath = compiledEq.evaluate({ x: xMath });
            } catch (err) {
                firstPoint = true; 
                continue;
            }
            
            if (typeof yMath !== 'number' || !isFinite(yMath)) {
                firstPoint = true; 
                continue;
            }

            const xCanvas = ((xMath - xMin) / (xMax - xMin)) * canvasWidth;
            const yCanvas = canvasHeight - ((yMath - yMin) / (yMax - yMin)) * canvasHeight;
            
            const buffer = 10; 
            if (yCanvas >= -buffer && yCanvas <= canvasHeight + buffer) {
                if (firstPoint) {
                    ctx.moveTo(xCanvas, yCanvas);
                    firstPoint = false;
                } else {
                    ctx.lineTo(xCanvas, yCanvas);
                }
            } else {
                firstPoint = true; 
            }
        }
        ctx.stroke();
    }

    function drawAxesAndGrid(xMin, xMax, yMin, yMax) {
        // ... (drawAxesAndGrid function remains the same) ...
        ctx.strokeStyle = '#ccc'; 
        ctx.fillStyle = '#333';   
        ctx.lineWidth = 0.5;
        ctx.font = '10px Arial';

        const yZeroCanvas = canvasHeight - ((-yMin) / (yMax - yMin)) * canvasHeight;
        if (yZeroCanvas >= 0 && yZeroCanvas <= canvasHeight) {
            ctx.beginPath();
            ctx.moveTo(0, yZeroCanvas);
            ctx.lineTo(canvasWidth, yZeroCanvas);
            ctx.stroke();
        }

        const xTickCount = 10;
        for (let i = 0; i <= xTickCount; i++) {
            const xMath = xMin + (i / xTickCount) * (xMax - xMin);
            const xCanvas = (i / xTickCount) * canvasWidth;
            
            ctx.beginPath();
            ctx.moveTo(xCanvas, 0);
            ctx.lineTo(xCanvas, canvasHeight); 
            ctx.stroke();
            
            ctx.fillText(xMath.toFixed(1), xCanvas + 2, Math.min(Math.max(yZeroCanvas - 2, 10), canvasHeight - 2));
        }

        const xZeroCanvas = ((-xMin) / (xMax - xMin)) * canvasWidth;
        if (xZeroCanvas >= 0 && xZeroCanvas <= canvasWidth) {
            ctx.beginPath();
            ctx.moveTo(xZeroCanvas, 0);
            ctx.lineTo(xZeroCanvas, canvasHeight);
            ctx.stroke();
        }
        
        const yTickCount = 10;
        for (let i = 0; i <= yTickCount; i++) {
            const yMath = yMin + (i / yTickCount) * (yMax - yMin);
            const yCanvas = canvasHeight - (i / yTickCount) * canvasHeight;

            ctx.beginPath();
            ctx.moveTo(0, yCanvas);
            ctx.lineTo(canvasWidth, yCanvas); 
            ctx.stroke();
            
            if (Math.abs(yMath) > 1e-9 || yMath === 0) { 
                 ctx.fillText(yMath.toFixed(1), Math.min(Math.max(xZeroCanvas + 2, 2), canvasWidth - 20), yCanvas - 2);
            }
        }
    }

    // --- Event Listeners ---
    plotButton.addEventListener('click', plotEquation);
    equationInput.addEventListener('input', updateEquationPreview); // Update preview on input

    // --- Initial Setup ---
    updateEquationPreview(); // Render initial equation in preview
    plotEquation();        // Plot initial equation
});