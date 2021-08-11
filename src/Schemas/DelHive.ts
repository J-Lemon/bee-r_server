import {JSONSchemaType} from "ajv";

interface Schema {
    identifier: string,
}

const validator: JSONSchemaType< Schema > = {
    type: 'object',
    properties: {
        identifier: { type: 'string', nullable: false },
    },
    required: [ 'identifier' ],
    additionalProperties: false
}

export { Schema, validator };