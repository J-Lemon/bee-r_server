import express    from 'express';
import Context    from './Context';
import * as query from './Schemas/Query';

export default class QueryApi {
    private static   instance: QueryApi;
    private readonly context: Context;

    private constructor( context: Context ) {
        this.context = context;
    }

    /**
     * Generate the api singleton object
     * @param context a Context object.
     * @returns an instance of BeerApi.
     */
    public static genInstance( context: Context ): QueryApi {
        if( QueryApi.instance == undefined )
            QueryApi.instance = new QueryApi( context );
        return QueryApi.instance;
    }

    /**
     * Get a defined number of record from a hive
     * @param client_id a string representing the hive client_id.
     * @param limit a number representing the number of records to read.
     * @returns an array of records.
     */
    private async getHiveData( identifier: string, take: number = 100, context: Context ): Promise< any[] > {
        try{
            const hive = await context.hivesRepo.findOneOrFail( { identifier } );

            return await context.metricsRepo.find( {
                where: { hive },
                take,
                order: { id: 'DESC' },
                relations: [ 'reads' ]
            } );
        }catch( error ){
            throw error;
        }
    }

    /**
     * It's used by express query method.
     * Note: query parameter identifier must be provided otherwise a 400 will be returned.
     */
    private queryHive( context: Context ): ( req: any, res: any ) => Promise< void > {
        return async (req: any, res: any) => {
            try {
                const take = req.query.hasOwnProperty('take') ?
                    parseInt(req.query.take) : 100;

                return res.status(200)
                    .json(await this.getHiveData(req.query.identifier, take, context));
            } catch (error) {
                context.log.error(error);
                return res.status(500);
            }
        }
    }

    public genRouter(): express.Router {
        return express.Router()
                      .get( '/query',[
                            this.context.genHttpValidator< query.Schema >( query.validator ), 
                            this.queryHive( this.context ) ] )
    }
}