import {JSONSchemaType} from "ajv";

interface Read {
    id:        number,
    sensor_id: number,
    value:     string | number,
}

interface Schema {
    id:    number,
    date:  string,
    reads: Read[]
}

const validator: JSONSchemaType< Schema > = {
    type: 'object',
    properties: {
        id:    { type: 'number', nullable: false, minimum: 0 },
        date:  { type: 'string', nullable: false, format: 'date-time' },
        reads: { type: 'array',  nullable: false, items: {
            type: 'object',
            properties: {
                id:        { type:   'number',             nullable: false, minimum: 0 },
                sensor_id: { type:   'number',             nullable: false, minimum: 0, maximum: 40 },
                value:     { type: [ 'number', 'string' ], nullable: false },
            },
            minContains: 1,
            maxContains: 40
        } },
    },
    required: [ 'id', 'date', 'reads' ],
    additionalProperties: false
}

export { Schema, validator };