import {JSONSchemaType} from "ajv";

interface Schema {
    identifier: string,
    take:       number
}

const validator: JSONSchemaType< Schema > = {
    type: 'object',
    properties: {
        identifier: { type: 'string', nullable: false, minLength: 1 },
        take:       { type: 'number', nullable: true,  minimum: 1,  maximum: 1000 },
    },
    required: [ 'identifier' ],
    additionalProperties: false
}

export { Schema, validator };