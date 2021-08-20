import Hive                             from './Models/Hive';
import Metric                           from './Models/Metric';
import Read                             from './Models/Read';
import Ajv, {JSONSchemaType}            from 'ajv';
import winston                          from 'winston';
import { createConnection, Connection, 
         ConnectionOptions }            from 'typeorm';
import { Either, left, right }          from "tsmonads";
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
    private readonly   _readsRp: Repository< Read >;

    private constructor( db: Connection, hivesRp: Repository< Hive >, metricsRp: Repository< Metric >, readsRp: Repository< Read > ) {
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
        this._readsRp   = readsRp;
        this._hivesRp   = hivesRp;
        this._db        = db;
    }

    public static async genInstance( dbConf: ConnectionOptions | undefined = undefined ): Promise< Either< Error, Context > > {
        try{
            if( !Context.instance ){
                const db         = dbConf == undefined ? await createConnection() : await createConnection( dbConf );
                const hivesRp    = getRepository( Hive );
                const metricsRp  = getRepository( Metric );
                const readsRp    = getRepository( Read );
                Context.instance = new Context( db, hivesRp, metricsRp, readsRp );
            }
            return right( Context.instance );
        }catch( error ){
            return left( error );
        }
    }

    public genHttpValidator<T>( schema: JSONSchemaType<T> ): ( req: any, res: any, next: any ) => void {
        const validate = this._validator.compile( schema );
        return ( req: any, res: any, next: any ) => {
            const validation = validate( Object.keys( req.body ).length != 0 ? req.body : req.query );
            if( !validation ) return res.status( 400 ).json( validate.errors );
            next();
        }
    }

    public get db():          Connection           { return this._db; }
    public get log():         Log                  { return this._log; }
    public get hivesRepo():   Repository< Hive >   { return this._hivesRp; }
    public get metricsRepo(): Repository< Metric > { return this._metricsRp; }
    public get readsRepo():   Repository< Read >   { return this._readsRp; }
    public get validator():   Validator            { return this._validator; }
}
