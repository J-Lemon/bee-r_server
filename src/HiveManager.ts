import Hive                                      from "./Models/Hive";
import Context                                   from "./Context";
import { Repository }                            from "typeorm";
import { match, Either, left, right, getOrElse } from 'fp-ts/lib/Either';
import { AuthenticateError }                     from 'aedes';
import { pipe }                                  from 'fp-ts/function';
import * as addHive                              from './Schemas/AddHive';
import * as delHive                              from './Schemas/DelHive';
import * as edtHive                              from './Schemas/EdtHive';
import express                                   from 'express'

export default class HiveManager {
    private static  instance: HiveManager;
    private readonly    repo: Repository< Hive >;
    private readonly context: Context;

    private constructor( context: Context ) {
        this.repo    = context.db.getRepository( Hive );
        this.context = context;
    }

    public static genInstance( context: Context ): Either< Error, HiveManager > {
        try{
            if( !HiveManager.instance ){
                HiveManager.instance = new HiveManager( context );
                return right( HiveManager.instance );
            }
            return left( new Error( 'HiveManager already initialized' ) );
        }catch( error ){
            return left( error );
        }
    }

    public async login( identifier: string, password: string ): Promise< Either< AuthenticateError, boolean > > {
        try{
            const hive = await this.repo.findOne( { identifier } );
            if( !hive )
                return left( { ...new Error( `Failed attempt to login with identifier '${ identifier }'` ), returnCode: 4 });
            
            return await hive.comparePassword( password );
        }catch( error ){
            return left( error );
        }
    }

    private async createHive( ip: string, identifier: string, password: string ): Promise< Either< Error, Hive > > {
        try{
            const duplicates = await this.repo.count( { where: [ {identifier}, {ip} ] } );
            if( duplicates != 0 )
                return left( new Error( `Failed attempt to create hive with identifier '${ identifier }' and ip '${ ip }'` ) );

            const hive      = new Hive();
            hive.ip         = ip;
            hive.password   = password;
            hive.identifier = identifier;

            this.repo.create( hive );

            return right( hive );
        }catch( error ){
            return left( error );
        }
    }

    private async updateHive( identifier: string, ip?: string, password?: string ): Promise< Either< Error, Hive > > {
        try{
            const hive = await this.repo.findOne( { identifier } );
            if( !hive )
                return left( new Error( `Hive with identifier '${ identifier }' not exist` ) );

            if( ip )
                hive.ip = ip;

            if( password )
                hive.password = password;

            this.repo.update( hive.id, hive );

            return right( hive );
        }catch( error ){
            return left( error );
        }
    }

    private async deleteHive( identifier: string ): Promise< Either< Error, Hive > > {
        try{
            const hive = await this.repo.findOne( { identifier } );
            if( !hive )
                return left( new Error( `Hive with identifier '${ identifier }' not exist` ) );

            await this.repo.delete( hive.id );

            return right( hive );
        }catch( error ){
            return left( error );
        }
    }

    private addHiveMiddleware(): ( req: any, res: any ) => Promise< void > {
        return async ( req: any, res: any ): Promise< void > => {
            const { ip, identifier, password } = req.body; 
            return pipe(
                await this.createHive( ip, identifier, password ),
                match( 
                    ( error  ) => res.status( 500 ).json( { error } ),
                    ( result ) => res.status( 200 ).json( { id: result.id } ) )
            );
        }
    }

    private edtHiveMiddleware(): ( req: any, res: any ) => Promise< void > {
        return async ( req: any, res: any ): Promise< void > => {
            const { ip, identifier, password } = req.body; 
            return pipe(
                await this.updateHive( ip, identifier, password ),
                match(
                    ( error  ) => res.status( 500 ).json( { error } ),
                    ( result ) => res.status( 200 ).json( { id: result.id } ) )
            );
        }
    }

    private delHiveMiddleware(): ( req: any, res: any ) => Promise< void > {
        return async ( req: any, res: any ): Promise< void > => {
            const { identifier } = req.body; 
            return pipe(
                await this.deleteHive( identifier ),
                match( 
                    ( error  ) => res.status( 500 ).json( { error } ),
                    ( result ) => res.status( 200 ).json( { id: result.id } ) )
            );
        }
    }

    public genRouter(): express.Router {
        return express.Router()
            .put(    '/', [ this.context.genValidator< edtHive.Schema >( edtHive.validator ), this.edtHiveMiddleware() ] )
            .post(   '/', [ this.context.genValidator< addHive.Schema >( addHive.validator ), this.addHiveMiddleware() ] )
            .delete( '/', [ this.context.genValidator< delHive.Schema >( delHive.validator ), this.delHiveMiddleware() ] )
    }
}