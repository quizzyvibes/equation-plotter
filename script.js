document.addEventListener('DOMContentLoaded', () => {
    const equationInput = document.getElementById('equation');
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

    // --- Math.js Parser ---
    let parser;
    try {
        parser = math.parser();
    } catch (e) {
        displayError("Error initializing math parser. Ensure math.js is loaded.");
        console.error(e);
        return; // Stop if parser fails
    }


    function displayError(message) {
        errorMessagesDiv.textContent = message;
    }

    function clearError() {
        errorMessagesDiv.textContent = '';
    }

    function plotEquation() {
        clearError();
        const equationStr = equationInput.value.trim();
        if (!equationStr) {
            displayError("Please enter an equation.");
            return;
        }

        let compiledEq;
        try {
            // For security and better math function support, use math.js compile
            // This creates a function that can be evaluated with a scope
            const node = math.parse(equationStr);
            compiledEq = node.compile();
        } catch (err) {
            displayError(`Error parsing equation: ${err.message}`);
            console.error(err);
            return;
        }

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

        // Clear canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);


        // --- Draw Axes and Grid ---
        drawAxesAndGrid(xMin, xMax, yMin, yMax);

        // --- Plot the function ---
        ctx.beginPath();
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;

        const numPoints = canvasWidth * 2; // Number of points to plot, increase for smoother curve
        const dx = (xMax - xMin) / numPoints;
        let firstPoint = true;

        for (let i = 0; i <= numPoints; i++) {
            const xMath = xMin + i * dx;
            let yMath;

            try {
                // Provide 'x' in the scope for evaluation
                yMath = compiledEq.evaluate({ x: xMath });
            } catch (err) {
                // Skip points that cause evaluation errors (e.g., log(-1), 1/0)
                // console.warn(`Error evaluating at x=${xMath}: ${err.message}`);
                firstPoint = true; // Disconnect line if there's a break
                continue;
            }
            
            // Check for non-real or non-finite results
            if (typeof yMath !== 'number' || !isFinite(yMath)) {
                firstPoint = true; // Disconnect line for undefined/infinity
                continue;
            }

            const xCanvas = ((xMath - xMin) / (xMax - xMin)) * canvasWidth;
            const yCanvas = canvasHeight - ((yMath - yMin) / (yMax - yMin)) * canvasHeight;

            // Only draw if within canvas y-bounds (x is implicitly handled by loop)
            // Add a small buffer to allow lines to start/end slightly off-screen
            const buffer = 10; 
            if (yCanvas >= -buffer && yCanvas <= canvasHeight + buffer) {
                if (firstPoint) {
                    ctx.moveTo(xCanvas, yCanvas);
                    firstPoint = false;
                } else {
                    ctx.lineTo(xCanvas, yCanvas);
                }
            } else {
                // If point is way off, treat next valid point as a new line segment start
                firstPoint = true; 
            }
        }
        ctx.stroke();
    }

    function drawAxesAndGrid(xMin, xMax, yMin, yMax) {
        ctx.strokeStyle = '#ccc'; // Grid color
        ctx.fillStyle = '#333';   // Text color
        ctx.lineWidth = 0.5;
        ctx.font = '10px Arial';

        // --- X-axis and Grid ---
        const yZeroCanvas = canvasHeight - ((-yMin) / (yMax - yMin)) * canvasHeight;
        if (yZeroCanvas >= 0 && yZeroCanvas <= canvasHeight) {
            ctx.beginPath();
            ctx.moveTo(0, yZeroCanvas);
            ctx.lineTo(canvasWidth, yZeroCanvas);
            ctx.stroke();
        }

        // X-axis Ticks and Labels
        const xTickCount = 10;
        for (let i = 0; i <= xTickCount; i++) {
            const xMath = xMin + (i / xTickCount) * (xMax - xMin);
            const xCanvas = (i / xTickCount) * canvasWidth;
            
            ctx.beginPath();
            ctx.moveTo(xCanvas, 0);
            ctx.lineTo(xCanvas, canvasHeight); // Vertical grid line
            ctx.stroke();
            
            ctx.fillText(xMath.toFixed(1), xCanvas + 2, Math.min(Math.max(yZeroCanvas - 2, 10), canvasHeight - 2));
        }

        // --- Y-axis and Grid ---
        const xZeroCanvas = ((-xMin) / (xMax - xMin)) * canvasWidth;
        if (xZeroCanvas >= 0 && xZeroCanvas <= canvasWidth) {
            ctx.beginPath();
            ctx.moveTo(xZeroCanvas, 0);
            ctx.lineTo(xZeroCanvas, canvasHeight);
            ctx.stroke();
        }
        
        // Y-axis Ticks and Labels
        const yTickCount = 10;
        for (let i = 0; i <= yTickCount; i++) {
            const yMath = yMin + (i / yTickCount) * (yMax - yMin);
            const yCanvas = canvasHeight - (i / yTickCount) * canvasHeight;

            ctx.beginPath();
            ctx.moveTo(0, yCanvas);
            ctx.lineTo(canvasWidth, yCanvas); // Horizontal grid line
            ctx.stroke();
            
            if (Math.abs(yMath) > 1e-9 || yMath === 0) { // Avoid labeling near zero if it's the axis
                 ctx.fillText(yMath.toFixed(1), Math.min(Math.max(xZeroCanvas + 2, 2), canvasWidth - 20), yCanvas - 2);
            }
        }
    }

    plotButton.addEventListener('click', plotEquation);

    // Initial plot with default values
    plotEquation(); 
});