import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Introduction',
      items: ['introduction/overview'],
    },
    {
      type: 'category',
      label: 'Core Flow',
      items: ['core-flow/user-flows'],
    },
    {
      type: 'category',
      label: 'Smart Contracts',
      items: ['smart-contracts/overview'],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: ['api-reference/endpoints'],
    },
    {
      type: 'category',
      label: 'Developer Guide',
      items: ['developer-guide/quick-start'],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: ['deployment/testnet'],
    },
    {
      type: 'category',
      label: 'Security',
      items: ['security/overview'],
    },
  ],
};

export default sidebars;
