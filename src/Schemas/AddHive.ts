import {JSONSchemaType} from "ajv";

interface Schema {
    ip:         string,
    identifier: string,
    password:   string
}

const validator: JSONSchemaType< Schema > = {
    type: 'object',
    properties: {
        ip:         { type: 'string', nullable: false },
        identifier: { type: 'string', nullable: false },
        password:   { type: 'string', nullable: false },
    },
    required: [ 'ip', 'identifier', 'password' ],
    additionalProperties: false
}

export { Schema, validator };