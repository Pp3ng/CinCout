// Handles showing/hiding panels and managing the layout
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing layout manager');
    
    // Panel elements
    const outputPanel = document.getElementById('outputPanel');
    const editorPanel = document.querySelector('.editor-panel');
    const closeOutputBtn = document.getElementById('closeOutput');
    
    // Action buttons that should show the output panel
    const actionButtons = [
        document.getElementById('compile'),
        document.getElementById('viewAssembly'),
        document.getElementById('styleCheck'),
        document.getElementById('memcheck')
    ];
    
    // Handle closing the output panel
    // Note: The actual cleanup is handled in handlers.js
    closeOutputBtn.addEventListener('click', function() {
        console.log('Closing output panel');
        outputPanel.style.display = 'none';
        editorPanel.classList.remove('with-output');
        // Need to refresh the CodeMirror instance when size changes
        if (window.editor) {
            setTimeout(() => window.editor.refresh(), 10);
        }
    });
    
    // Add panel visibility handlers to action buttons WITHOUT interfering with original handlers
    // This fixes the double execution issue by not trying to call the original handlers
    actionButtons.forEach(button => {
        if (button) {
            // Only handle the panel visibility with capture phase
            // This ensures the panel is shown BEFORE the original event handler is executed
            button.addEventListener('click', function showPanel(e) {
                console.log(`Action button clicked: ${button.id} - showing panel`);
                
                // Only handle panel visibility, don't call original handlers
                if (outputPanel.style.display === 'none') {
                    console.log('Showing output panel');
                    outputPanel.style.display = 'flex';
                    editorPanel.classList.add('with-output');
                    
                    // Need to refresh the CodeMirror instance when size changes
                    if (window.editor) {
                        setTimeout(() => window.editor.refresh(), 10);
                    }
                    
                    // If assembly button was clicked, switch to assembly tab
                    if (button.id === 'viewAssembly') {
                        document.getElementById('assemblyTab').click();
                    } else {
                        // Otherwise default to output tab
                        document.getElementById('outputTab').click();
                    }
                } else {
                    console.log('Output panel already visible');
                }
                
                // The original event handler will be called automatically via event propagation
                // Don't try to manually invoke any handlers here as it would cause double execution
            }, true); // true = capture phase, runs before bubbling phase
        }
    });
    
    // Tab switching
    document.getElementById('outputTab').addEventListener('click', function() {
        console.log('Switching to output tab');
        this.classList.add('active');
        document.getElementById('assemblyTab').classList.remove('active');
        document.getElementById('output').style.display = 'block';
        document.getElementById('assembly').style.display = 'none';
    });
    
    document.getElementById('assemblyTab').addEventListener('click', function() {
        console.log('Switching to assembly tab');
        this.classList.add('active');
        document.getElementById('outputTab').classList.remove('active');
        document.getElementById('output').style.display = 'none';
        document.getElementById('assembly').style.display = 'block';
        
        // Refresh assembly view
        if (window.assemblyView) {
            setTimeout(() => window.assemblyView.refresh(), 10);
        }
    });
    
    // Handle resize events
    window.addEventListener('resize', function() {
        if (window.editor) {
            window.editor.refresh();
        }
        if (window.assemblyView) {
            window.assemblyView.refresh();
        }
        // Handle terminal resize if it exists
        if (window.fitAddon) {
            window.fitAddon.fit();
        }
    });
    
    console.log('Layout manager initialization complete');
}); 