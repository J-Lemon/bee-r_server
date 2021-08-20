import chai, { expect }  from 'chai';
import chaiHttp          from 'chai-http';
import express           from 'express';
import bodyParser        from 'body-parser';
import Service           from '../src/Service';
import mqtt              from 'mqtt';

chai.use( chaiHttp );
chai.should();

describe('HiveManager tests', () => {

    let expr:   express.Application;
    let hiveId: string;
    let hivePw: string;
    let mqtt_client: mqtt.Client;
    let metrics: any[] = [];

    it( 'Should create a Service object', async () => {
        const srv = await Service.genInstance();

        if( srv.isLeft ) throw srv.left;

        expr = express()
                .use( bodyParser.urlencoded( { extended: false } ) )
                .use( bodyParser.json() )
                .use( srv.right.genRouter() )

        srv.right.listenMqtt(9999);
    });


    it( 'Should create an Hive', ( done ) => {
        chai.request( expr )
            .post( '/hive' )
            .end( ( err, res ) => {
                res.should.have.status( 200 );
                res.body.should.be.a( 'object' );
                expect( res.body.id ).is.eq( 1 );
                expect( res.body.identifier.startsWith( 'hive-' ) ).is.eq( true );
                hiveId = res.body.identifier;
                hivePw = res.body.password;
                done();
            } );
    });

    it( 'Should get the hive by id', ( done ) => {
        chai.request( expr )
            .get( '/hive' )
            .end( ( err, res ) => {
                res.should.have.status( 200 );
                res.body.should.be.a( 'array' );
                expect( res.body.length ).is.eq( 1 );
                expect( res.body[ 0 ].id ).is.eq( 1 );
                expect( res.body[ 0 ].identifier ).is.eq( hiveId );
                done();
            } );
    } );


    it( 'Should list one hive', ( done ) => {
        chai.request( expr )
            .get( `/hive/${hiveId}` )
            .end( ( err, res ) => {
                res.should.have.status( 200 );
                res.body.should.be.a( 'object' );
                expect( res.body.id ).is.eq( 1 );
                expect( res.body.identifier ).is.eq( hiveId );
                done();
             } );
    } );

    it( `Should return empty metrics list for first hive`, ( done ) => {
        chai.request( expr )
            .get( `/query?identifier=${hiveId}` )
            .end( ( err, res ) => {
                res.should.have.status( 200 );
                res.body.should.be.a( 'array' );
                expect( res.body.length ).is.eq( 0 );
                done();
            } );
    } );

    it( `Should login to mqtt and send a message`, ( done ) => {
        mqtt_client = mqtt.connect( 'mqtt://127.0.0.1:9999', {
            clientId: hiveId,
            username: hiveId,
            password: hivePw
        } )
        mqtt_client.on( 'connect', () => {
            expect( mqtt_client.connected ).is.eq( true );

            metrics.push( {
                date: new Date().toISOString(),
                reads: [
                    {
                        sensor_id: 1,
                        value: '1'
                    }
                ]
            } );

            mqtt_client.publish( 'metrics', JSON.stringify( metrics[ 0 ] ) );

            done();
        } )
    } );

    it( `Should return metrics list of one element for first hive`, ( done ) => {
        setTimeout(() => {
            chai.request(expr)
                .get(`/query?identifier=${hiveId}`)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('array');
                    expect(res.body.length).is.eq(1);
                    expect(res.body[0].id).is.eq(1);
                    expect(res.body[0].reads.length).is.eq(1);
                    expect(res.body[0].reads[0].sensor_id).is.eq(metrics[0].reads[0].sensor_id);
                    expect(res.body[0].reads[0].value).is.eq(metrics[0].reads[0].value);

                    done();
                });
        }, 500);
    } );


    it( `Should send three`, ( done ) => {

        const current_reads = [ {
                    date: new Date().toISOString(),
                    reads: [
                    {
                        sensor_id: 1,
                        value: '2'
                    }
                ]
            },
            {
                date: new Date().toISOString(),
                reads: [
                    {
                        id: 3,
                        sensor_id: 1,
                        value: '1'
                    }
                ]
            },
            {
                date: new Date().toISOString(),
                reads: [
                    {
                        sensor_id: 1,
                        value: '2'
                    }
                ]
            }
        ]

        current_reads.forEach( r => mqtt_client.publish('metrics', JSON.stringify( r ) ) )

        metrics = [ ...metrics, ...current_reads ];
        done();
    } );

    it( `Should return metrics list of four elements for first hive`, ( done ) => {
        setTimeout( () => {
            chai.request( expr )
                .get( `/query?identifier=${hiveId}` )
                .end( ( err, res ) => {
                    res.should.have.status( 200 );
                    res.body.should.be.a( 'array' );
                    expect( res.body.length ).is.eq( 4 );
                    done();
                } );
        }, 500 );

    } );

} );