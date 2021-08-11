import Hive                             from './Models/Hive';
import Metric                           from './Models/Metric';
import Ajv, {JSONSchemaType}            from 'ajv';
import winston                          from 'winston';
import { createConnection, Connection } from 'typeorm';
import { Either, left, right }          from 'fp-ts/lib/Either';
import { Repository, getRepository }    from 'typeorm';
import addFormats                       from "ajv-formats";

type Log       = winston.Logger;
type Validator = Ajv;

export default class Context {
    private static     instance: Context;
    private readonly        _db: Connection;
    private readonly       _log: winston.Logger;
    private readonly   _hivesRp: Repository< Hive >;
    private readonly _validator: Ajv;
    private readonly _metricsRp: Repository< Metric >;

    private constructor( db: Connection, hivesRp: Repository< Hive >, metricsRp: Repository< Metric > ) {
        this._log = winston.createLogger( {
            level: 'info',
            format: winston.format.json(),
            defaultMeta: { service: 'beer_mqtt' },
            transports: [
              new winston.transports.File( { filename: process.env.LOG_PATH ? process.env.LOG_PATH : 'beer_mqtt.log' } ),
              new winston.transports.Console( { format: winston.format.simple() } )
            ],
        } );

        this._validator = addFormats( new Ajv() );
        this._metricsRp = metricsRp;
        this._hivesRp   = hivesRp;
        this._db        = db;
    }

    public static async genInstance( config: any ): Promise< Either< Error, Context > > {
        try{
            if( !Context.instance ){
                const db         = await createConnection();
                const hivesRp    = getRepository( Hive );
                const metricsRp  = getRepository( Metric );
                Context.instance = new Context( db, hivesRp, metricsRp );
                return right( Context.instance );
            }
            return left( new Error( 'Context already initialized' ) );
        }catch( error ){
            return left( error );
        }
    }

    public genValidator<T>( schema: JSONSchemaType<T> ): ( req: any, res: any, next: any ) => void {
        const validate = this._validator.compile( schema );
        return ( req: any, res: any, next: any ) => {
            const validation = validate( req.body || req.query );
            if( !validation ) return res.status( 400 ).json( validate.errors );
            next();
        }
    }

    public get db():          Connection           { return this._db; }
    public get log():         Log                  { return this._log; }
    public get hivesRepo():   Repository< Hive >   { return this._hivesRp; }
    public get metricsRepo(): Repository< Metric > { return this._metricsRp; }
    public get validator():   Validator            { return this._validator; }
}