// Handles showing/hiding panels and managing the layout

document.addEventListener('DOMContentLoaded', function() {
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
    closeOutputBtn.addEventListener('click', function() {
        outputPanel.style.display = 'none';
        editorPanel.classList.remove('with-output');
        // Need to refresh the CodeMirror instance when size changes
        if (window.editor) {
            setTimeout(() => window.editor.refresh(), 10);
        }
    });
    
    // Add click listeners to action buttons
    actionButtons.forEach(button => {
        if (button) {
            const originalClick = button.onclick;
            
            button.addEventListener('click', function(e) {
                // Show the output panel if it's hidden
                if (outputPanel.style.display === 'none') {
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
                }
                
                // If the button had an original click handler, call it
                if (typeof originalClick === 'function') {
                    originalClick.call(this, e);
                }
            });
        }
    });
    
    // Tab switching
    document.getElementById('outputTab').addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('assemblyTab').classList.remove('active');
        document.getElementById('output').style.display = 'block';
        document.getElementById('assembly').style.display = 'none';
    });
    
    document.getElementById('assemblyTab').addEventListener('click', function() {
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
}); 