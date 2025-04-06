// Handles showing/hiding panels and managing the layout
document.addEventListener('DOMContentLoaded', function() {
    // Panel elements
    const outputPanel = document.getElementById('outputPanel') as HTMLElement;
    const editorPanel = document.querySelector('.editor-panel') as HTMLElement;
    const closeOutputBtn = document.getElementById('closeOutput') as HTMLElement;
    
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
        outputPanel.style.display = 'none';
        editorPanel.classList.remove('with-output');
        // Need to refresh the CodeMirror instance when size changes
        if ((window as any).editor) {
            setTimeout(() => (window as any).editor.refresh(), 10);
        }
    });
    
    // Add panel visibility handlers to action buttons WITHOUT interfering with original handlers
    // This fixes the double execution issue by not trying to call the original handlers
    actionButtons.forEach(button => {
        if (button) {
            // Only handle the panel visibility with capture phase
            // This ensures the panel is shown BEFORE the original event handler is executed
            button.addEventListener('click', function showPanel(e) {
                // Only handle panel visibility, don't call original handlers
                if (outputPanel.style.display === 'none') {
                    outputPanel.style.display = 'flex';
                    editorPanel.classList.add('with-output');
                    
                    // Need to refresh the CodeMirror instance when size changes
                    if ((window as any).editor) {
                        setTimeout(() => (window as any).editor.refresh(), 10);
                    }
                    
                    // If assembly button was clicked, switch to assembly tab
                    if (button.id === 'viewAssembly') {
                        (document.getElementById('assemblyTab') as HTMLElement).click();
                    } else {
                        // Otherwise default to output tab
                        (document.getElementById('outputTab') as HTMLElement).click();
                    }
                } 
                // The original event handler will be called automatically via event propagation
                // Don't try to manually invoke any handlers here as it would cause double execution
            }, true); // true = capture phase, runs before bubbling phase
        }
    });
    
    // Tab switching
    document.getElementById('outputTab')!.addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('assemblyTab')!.classList.remove('active');
        (document.getElementById('output') as HTMLElement).style.display = 'block';
        (document.getElementById('assembly') as HTMLElement).style.display = 'none';
    });
    
    document.getElementById('assemblyTab')!.addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('outputTab')!.classList.remove('active');
        (document.getElementById('output') as HTMLElement).style.display = 'none';
        (document.getElementById('assembly') as HTMLElement).style.display = 'block';
        
        // Refresh assembly view
        if ((window as any).assemblyView) {
            setTimeout(() => (window as any).assemblyView.refresh(), 10);
        }
    });
    
    // Handle resize events
    window.addEventListener('resize', function() {
        if ((window as any).editor) {
            (window as any).editor.refresh();
        }
        if ((window as any).assemblyView) {
            (window as any).assemblyView.refresh();
        }
        // Handle terminal resize if it exists
        if ((window as any).fitAddon) {
            (window as any).fitAddon.fit();
        }
    });
});
