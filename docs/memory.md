# Development Memory

## 2024-03-30 - Netlify Deployment

### Challenge: SPA Routing in Netlify
SPAs with client-side routing typically break when deployed to Netlify because the server doesn't know how to handle non-root routes.

### Solution: 
- Added a _redirects file in the public folder with `/* /index.html 200` rule
- Also included the same rule in netlify.toml as a backup
- This ensures all routes are handled by the client-side router 

### Challenge: TypeScript Version Compatibility
Build failed due to TypeScript version 5.8.2 being incompatible with react-scripts 5.0.1, which only supports TypeScript 3.x or 4.x.

### Solution:
- Downgraded TypeScript to version 4.9.5 in package.json
- Updated build command in netlify.toml to use --legacy-peer-deps as a fallback
- This ensures proper dependency resolution during the build process 