import aedes, { Client }   from 'aedes';
import express             from 'express';
import Context             from './Context';
import Read                from './Models/Read';
import HiveManager         from './HiveManager';
import { match, tryCatch } from 'fp-ts/lib/Either';
import { pipe }            from 'fp-ts/function';
import { validator, Schema }       from './Schemas/Metric';

export default class Service {
    private readonly   instance: Service;
    private readonly mqttServer: aedes.Aedes;
    private readonly     router: express.Router;

    private constructor( hm: HiveManager, cnx: Context ) {
        this.mqttServer = aedes( {
            authenticate: async ( client: any, identifier: any, password: any, callback: any ) => {
                return pipe(
                    await hm.login( identifier, password.toString() ),
                    match(
                        ( error  ) => callback( error, false ),
                        ( result ) => callback( null, result )
                    )
                );
            }
        } );

        this.mqttServer.on( 'publish', ( packet, client ) => {
            pipe(
                tryCatch(
                    () => {
                        const validate = cnx.validator.compile( validator );
                        const data     = JSON.parse( packet.payload.toString() );
                        validate( data );
                        if( validate.errors )
                            throw validate.errors.toString();
                        return data;
                    },
                    ( error: Error ) => error
                ),
                match(
                    ( error ) => cnx.log.error( error ),
                    ( data  ) => tryCatch(
                        async () => {
                            const hive = await cnx.hivesRepo.findOneOrFail( { identifier: client.id } );
                            Promise.all( data.reads.map( r => {

                            } ) );
                        },
                        ( error: Error ) => error
                    ),
                )
            )

            /*pipe(
                match( ( error ) => cnx.log.error( error ),
                        ( data )  => tryCatch( () => {

                                                    if( validation )
                                               },
                                               ( error: Error ) => error
                                     )
                 )
                match( ( error ) => cnx.log.error( error ),
                       ( hive )  =>  )
                tryCatch( ()        => await cnx.hivesRepo.findOneOrFail( { identifier: client.id } ),
                          ( error ) => error
                ),
                match( ( error ) => cnx.log.error( error ),
                       ( hive )  =>  )
             )*/
        } );
    }
}
