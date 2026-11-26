/** Shared deterministic and manual timing fixtures; no wall-clock test thresholds. */
export const tableScannerRows = [
    {name: 'plain', row: '|| ordinary | text ||\n'},
    {name: 'inline code', row: '|| `code|span` | text ||\n'},
    {name: 'multiline code', row: '|| ``code ` short\nspan|inside`` | text ||\n'},
    {name: 'escaped backticks', row: '|| escaped \\` marker | text ||\n'},
];
