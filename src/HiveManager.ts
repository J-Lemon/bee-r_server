import Hive                    from './Models/Hive';
import Context                 from './Context';
import { Repository }          from 'typeorm';
import { AuthenticateError }   from 'aedes';
import * as delHive            from './Schemas/DelHive';
import express                 from 'express';
import { Either, left, right } from 'tsmonads';
import generatePassword        from 'password-generator';

class HiveManager {
    private static  instance: HiveManager;
    private readonly    repo: Repository< Hive >;
    private readonly context: Context;

    private constructor( context: Context ) {
        this.repo    = context.hivesRepo;
        this.context = context;
    }

    public static genInstance( context: Context ): HiveManager {
        if( !HiveManager.instance )
            HiveManager.instance = new HiveManager( context );
        return HiveManager.instance;
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

    private async createHive(): Promise< Either< Error, Hive > > {
        try{
            const _genHiveIdentifier = async(): Promise<string> => {
                const identifier = `hive-${ generatePassword( 6, false ) }`;
                const duplicates = await this.repo.count( {identifier} );
                if( duplicates != 0 )
                    return _genHiveIdentifier();
                return identifier;
            }

            const password = generatePassword( 14, false );

            const hive      = new Hive();
            hive.password   = password;
            hive.identifier = await _genHiveIdentifier();
            await this.repo.save( hive );

            hive.password = password;

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

    private processResult( res: express.Response, result: Either< Error, Hive > ): any {
        if( result.isLeft ) return res.status( 500 ).json( { error: result.left.toString() } )
        return res.status( 200 ).json( result.right );
    }

    private addHiveMiddleware(): ( req: express.Request, res: express.Response ) => Promise< void > {
        return async ( req: express.Request, res: express.Response ): Promise< void > => {
            return this.processResult( res, await this.createHive() );
        }
    }

    private delHiveMiddleware(): ( req: express.Request, res: express.Response ) => Promise< void > {
        return async ( req: express.Request, res: express.Response ): Promise< void > => {
            const { identifier } = req.body;
            return this.processResult( res, await this.deleteHive( identifier ) );
        }
    }

    private getHiveMiddleware(): ( req: express.Request, res: express.Response ) => Promise< any > {
        return async( req: express.Request, res: express.Response ) => {
            try{
                const hive = await this.repo.findOne( { identifier: req.params.identifier } );

                if( !hive )
                    return res.status( 404 );

                return res.status( 200 ).json( { ...hive, password: undefined, metrics: undefined } );
            }catch( error ){
                this.context.log.error( error );
                return res.status( 500 );
            }
        }
    }

    /**
     * It's used by express hive head method.
     */
    private getHivesListMiddleware(): ( req: express.Request, res: express.Response ) => Promise< any > {
        return async( req: express.Request, res: express.Response ) => {
            try{
                return res.status( 200 )
                    .json( ( await this.repo.find() )
                        .map( h => {
                            return { ...h, password: undefined, metrics: undefined };
                        } ) );
            }catch( error ){
                this.context.log.error( error );
                return res.status( 500 );
            }
        }
    }

    public genRouter(): express.Router {
        return express.Router()
            .get(    '/hive',             this.getHivesListMiddleware() )
            .get(    '/hive/:identifier', this.getHiveMiddleware() )
            .post(   '/hive',             this.addHiveMiddleware() )
            .delete( '/hive',     [ this.context.genHttpValidator< delHive.Schema >( delHive.validator ), this.delHiveMiddleware() ] )
    }
}

export default HiveManager;