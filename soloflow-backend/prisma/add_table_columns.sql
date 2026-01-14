-- Adicionar campos para tipo TABLE no FormFieldVersion
ALTER TABLE form_field_versions ADD COLUMN tableColumns TEXT;
ALTER TABLE form_field_versions ADD COLUMN minRows INTEGER;
ALTER TABLE form_field_versions ADD COLUMN maxRows INTEGER;
