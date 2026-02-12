import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'StackHub',
    description: 'View and manage stacked GitHub pull requests.',
    permissions: ['storage'],
    host_permissions: ['https://api.github.com/*', 'https://github.com/*']
  }
});
