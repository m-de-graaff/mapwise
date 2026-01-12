# Fumadocs UI (the default theme of Fumadocs): Type Table
URL: /docs/ui/components/type-table
Source: https://raw.githubusercontent.com/fuma-nama/fumadocs/refs/heads/main/apps/docs/content/docs/ui/components/type-table.mdx

A table for documenting types
        


<Installation name="type-table" />

## Usage

<FeedbackBlock id="72dcfba24502d660" body="It accepts a type property.">
  It accepts a `type` property.
</FeedbackBlock>

```mdx
import { TypeTable } from 'fumadocs-ui/components/type-table';

<TypeTable
  type={{
    percentage: {
      description: 'The percentage of scroll position to display the roll button',
      type: 'number',
      default: 0.2,
    },
  }}
/>
```

## References

### Type Table

<TypeTable
  type={{
  "name": "TypeTableProps",
  "description": "",
  "entries": [
    {
      "name": "type",
      "description": "",
      "tags": [],
      "type": "Record<string, TypeNode>",
      "simplifiedType": "Record<string, object>",
      "required": true,
      "deprecated": false
    }
  ]
}}
/>

### Object Type

<TypeTable
  type={{
  "name": "ObjectTypeProps",
  "description": "",
  "entries": [
    {
      "name": "description",
      "description": "Additional description of the field",
      "tags": [],
      "type": "ReactNode",
      "simplifiedType": "ReactNode",
      "required": false,
      "deprecated": false
    },
    {
      "name": "type",
      "description": "type signature (short)",
      "tags": [],
      "type": "ReactNode",
      "simplifiedType": "ReactNode",
      "required": true,
      "deprecated": false
    },
    {
      "name": "typeDescription",
      "description": "type signature (full)",
      "tags": [],
      "type": "ReactNode",
      "simplifiedType": "ReactNode",
      "required": false,
      "deprecated": false
    },
    {
      "name": "typeDescriptionLink",
      "description": "Optional `href` for the type",
      "tags": [],
      "type": "string | undefined",
      "simplifiedType": "string",
      "required": false,
      "deprecated": false
    },
    {
      "name": "default",
      "description": "",
      "tags": [],
      "type": "ReactNode",
      "simplifiedType": "ReactNode",
      "required": false,
      "deprecated": false
    },
    {
      "name": "required",
      "description": "",
      "tags": [],
      "type": "boolean | undefined",
      "simplifiedType": "boolean",
      "required": false,
      "deprecated": false
    },
    {
      "name": "deprecated",
      "description": "",
      "tags": [],
      "type": "boolean | undefined",
      "simplifiedType": "boolean",
      "required": false,
      "deprecated": false
    },
    {
      "name": "parameters",
      "description": "",
      "tags": [],
      "type": "ParameterNode[] | undefined",
      "simplifiedType": "array",
      "required": false,
      "deprecated": false
    },
    {
      "name": "returns",
      "description": "",
      "tags": [],
      "type": "ReactNode",
      "simplifiedType": "ReactNode",
      "required": false,
      "deprecated": false
    }
  ]
}}
/>
