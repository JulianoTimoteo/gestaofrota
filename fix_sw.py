with open('Appweb/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

sw_script = """
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for(let registration of registrations) {
                        if (registration.scope.includes('/gestaofrota/') && !registration.scope.endsWith('Appweb/')) {
                            console.log('Unregistering old root SW:', registration.scope);
                            registration.unregister();
                        }
                    }
                });
                navigator.serviceWorker.register('./sw.js?v=22').then(reg => {
"""

text = text.replace("if ('serviceWorker' in navigator) {\n                navigator.serviceWorker.register('./sw.js?v=22').then(reg => {", sw_script)

with open('Appweb/index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('SW unregister logic added')
