import net                     from 'net';
import tls                     from 'tls';
import http                    from 'http';
import https                   from 'https';
import aedes                   from 'aedes';
import express                 from 'express';
import Context                 from './Context';
import Read                    from './Models/Read';
import Metric                  from './Models/Metric';
import QueryApi                from './QueryApi';
import HiveManager             from './HiveManager';
import { validator }           from './Schemas/Metric';
import { Either, left, right } from "tsmonads";

export default class Service {
    private static     instance: Service;
    private readonly mqttServer: aedes.Aedes;
    private readonly    context: Context;
    private readonly         hm: HiveManager;

    private constructor( hm: HiveManager, cnx: Context ) {
        this.context    = cnx;
        this.hm         = hm;
        this.mqttServer = aedes( {
            authenticate: async ( client: any, identifier: any, password: any, callback: any ) => {
                const logRes = await hm.login( identifier, password.toString() );
                if( logRes.isLeft ) return callback( logRes.left, false )
                return callback( null, logRes.right )
            },
        } );

        this.mqttServer.on( 'publish', async( packet, client ) => {
            try{
                if( packet.topic != 'metrics' )
                    return;

                const validate = cnx.validator.compile(validator)
                const data     = JSON.parse( packet.payload.toString() );
                validate( data );
                if( validate.errors )
                    throw validate.errors.toString();

                const hive          = await cnx.hivesRepo.findOneOrFail( { identifier: client.id } );
                const reads: Read[] = await Promise.all( data.reads.map( ( r: any ): Promise< Read > => {
                    const read = new Read();
                    read.sensor_id = r.sensor_id;
                    read.value     = r.value;
                    return cnx.readsRepo.save( read );
                } ) );


                const metric     = new Metric();
                metric.date      = data.date;
                metric.reads     = reads;
                metric.hive      = hive;

                await cnx.metricsRepo.save( metric );
            }catch( error ){
                cnx.log.error( error.toString() );
            }
        } );
    }

    public static async genInstance(): Promise< Either< Error, Service > > {
        if( Service.instance == undefined ){
            const cnx = await Context.genInstance()
            if( cnx.isLeft ) return left( cnx.left );
            Service.instance = new Service( HiveManager.genInstance( cnx.right ), cnx.right );
        }
        return right( Service.instance );
    }

    public genRouter(): express.Router {
        const router = express.Router()
            .use( this.hm.genRouter() )
            .use( QueryApi.genInstance(this.context).genRouter() );
        return router;
    }

    public listenMqtt( port: number, cert: object | undefined = undefined ): Service {
        if( cert )
            tls.createServer( cert, this.mqttServer.handle );
        else
            net.createServer( this.mqttServer.handle ).listen( port );
        return this;
    }

    public listenHttp( port: number, cert: object | undefined = undefined ): Service {
        const app = express()
            .use( express.urlencoded( { extended: true } ) )
            .use( express.json() )
            .use( this.genRouter() )

        if( cert )
            https.createServer( cert, app ).listen( port );
        else
            http.createServer( app ).listen( port );
        return this;
    }

    
}
