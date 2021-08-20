import { expect }        from 'chai';
import Context           from '../src/Context';
import Hive              from '../src/Models/Hive';
import Metric            from '../src/Models/Metric';
import Read              from '../src/Models/Read';

describe('Context tests', () => {

    let cnx: Context;

    it( 'Should create a Context object', async () => {

        const res = await Context.genInstance( {
            type: "sqlite",
            synchronize: true,
            logging: false,
            database: './data/example.sq3',
            entities: [
                Hive, Metric, Read
            ]
        } );

        if( res.isLeft ) throw res.left;

        expect( res.right.db          ).is.not.undefined;
        expect( res.right.log         ).is.not.undefined;
        expect( res.right.validator   ).is.not.undefined;
        expect( res.right.readsRepo   ).is.not.undefined;
        expect( res.right.hivesRepo   ).is.not.undefined;
        expect( res.right.metricsRepo ).is.not.undefined;

        cnx = res.right;
    });
    /*
    it( 'Should create an hive', async () => {
        const m: ( ma: Either<Error, Context > ) => void = match( 
            error   => { throw error },
            context => { cnx = context }
         );

         m( await Context.genInstance( {
            type: "sqlite",
            synchronize: true,
            logging: false,
            database: './data/example.sq3',
            entities: [
                Hive, Metric, Read
            ]
         } ) );
    });*/

});