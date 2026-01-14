UPDATE form_field_versions 
SET tableColumns = '[{"name":"Nome","type":"TEXT","required":true},{"name":"Valor","type":"CURRENCY","required":true},{"name":"Data","type":"DATE","required":false}]', 
    minRows = 1, 
    maxRows = 10 
WHERE name = 'teste' AND type = 'TABLE';
