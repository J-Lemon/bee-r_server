import fs      from 'fs';
import aedes   from 'aedes';
import Queue   from 'bee-queue';
import dotenv  from 'dotenv';
import sqlite  from 'better-sqlite3-sqlcipher';
import bcrypt  from 'bcrypt';
import winston from 'winston';

enum ErrorCode {
  OtherCause         =  0,
  UserAlreadyPresent = -1,
  UserNotPresent     = -2,
  MalformedRequest   = -3
}

enum UserJobType {
  Create = 0,
  Update,
  Delete
}

interface UserJob {
  type:   UserJobType
  id?:         number
  identifier?: string
  password?:   string
}

const init = () => {
  dotenv.config();

  const log : winston.Logger = winston.createLogger( {
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'beer_mqtt' },
      transports: [
        new winston.transports.File( { filename: process.env.LOG_PATH ? process.env.LOG_PATH : 'beer_mqtt.log' } ),
        new winston.transports.Console( { format: winston.format.simple() } )
      ],
  } );

  try{
    let db = new sqlite( process.env.DB_PATH! );
    db.pragma( `key = "${ process.env.DB_ENCRYPT_KEY! }"` );

    db.prepare( "CREATE TABLE IF NOT EXIST mqtt_users ( id INTEGER PRIMARY KEY AUTOINCREMENT, identifier TEXT, password TEXT )" )
      .run();

    const user_queue : Queue< any > = new Queue( 'user_queue' );
    const user_salt  : number       = parseInt( process.env.SALT! );

    user_queue.process( async ( job : any, done : any ) => {
      try{
        const request : UserJob = job;

        switch( request.type ){
          case UserJobType.Create: {
            if( request.identifier != undefined && request.password != undefined ){
              if( db.prepare( "SELECT * FROM mqtt_users WHERE identifier = ?" ).get( request.identifier ) != undefined ){
                return done( { cause: ErrorCode.UserAlreadyPresent, message: "" } );
              }

              const curr_salt : string = await bcrypt.genSalt( user_salt );
              const hash      : string = await bcrypt.hash( request.password, curr_salt );
              const result    :    any = db.prepare( "INSERT INTO mqtt_users( NULL, ?, ? )" )
                                          .run( request.identifier, hash );
              log.info( `User with identifier '${ request.identifier }' correcly created in row '${ result.lastInsertRowid }'` );
              return done( null, result.lastInsertRowid );
            }
            return done( { cause: ErrorCode.MalformedRequest, message: "" } );
          }
          case UserJobType.Update: {
            if( request.password != undefined ){
              if( request.id != undefined ){
                if( db.prepare( "SELECT * FROM mqtt_users WHERE id = ?" ).get( request.id ) == undefined ){
                  return done( { cause: ErrorCode.UserNotPresent, message: "" } );
                }

                const curr_salt : string = await bcrypt.genSalt( user_salt );
                const hash      : string = await bcrypt.hash( request.password, curr_salt );
                const result    :    any = db.prepare( "UPDATE mqtt_users SET password = ? WHERE id = ?" )
                                             .run( hash, request.id );

                log.info( `User with id '${ request.id }' correcly updated from row '${ result.lastInsertRowid }'` );
                return done( null, result.lastInsertRowid );
              }else if( request.identifier != undefined ){
                if( db.prepare( "SELECT * FROM mqtt_users WHERE identifier = ?" ).get( request.identifier ) == undefined ){
                  return done( { cause: ErrorCode.UserNotPresent, message: "" } );
                }

                const curr_salt : string = await bcrypt.genSalt( user_salt );
                const hash      : string = await bcrypt.hash( request.password, curr_salt );
                const result : any = db.prepare( "UPDATE mqtt_users SET password = ? WHERE identifier = ?" )
                                       .run( hash, request.identifier );
                log.info( `User with identifier '${ request.identifier }' correcly updated from row '${ result.lastInsertRowid }'` );
                return done( null, result.lastInsertRowid );
              }
            }
            return done( { cause: ErrorCode.MalformedRequest, message: "" } );
          }
          case UserJobType.Delete: {
            if( request.identifier != undefined ){
              if( db.prepare( "SELECT * FROM mqtt_users WHERE identifier = ?" )
                    .get( request.identifier ) == undefined ){
                return done( { cause: ErrorCode.UserNotPresent, message: "" } );
              }

              const result : any = db.prepare( "DELETE FROM mqtt_users WHERE identifier = ?" )
                                     .run( request.identifier );
              log.info( `User with identifier '${ request.identifier }' correcly deleted from row '${ result.lastInsertRowid }'` );
              return done( null, result.lastInsertRowid );
            }

            if( request.id != undefined ){
              if( db.prepare( "SELECT * FROM mqtt_users WHERE id = ?" )
                    .get( request.id ) == undefined ){
                return done( { cause: ErrorCode.UserNotPresent, message: "" } );
              }

              const result : any = db.prepare( "DELETE FROM mqtt_users WHERE id = ?" )
                                     .run( request.id );
              log.info( `User with id '${ request.id }' correcly deleted from row '${ result.lastInsertRowid }'` );
              return done( null, result.lastInsertRowid );
            }
          }
        }
      }catch( error ){
        return done( { cause: ErrorCode.OtherCause, message: error.toString() } );
      }
    } );

    const port = parseInt( process.env.PORT! );

    const options = {
      key:  fs.readFileSync( process.env.KEY_PEM! ),
      cert: fs.readFileSync( process.env.CRT_PEM! )
    };

    const mqtt = aedes( {
      authenticate: async (client, identifier, password, callback) => {
        const result = db.prepare( "SELECT password FROM mqtt_users WHERE identifier = ?" )
                         .get( identifier );
        if( result == undefined ){
          let error : any = new Error( 'Undefined user' );
          error.returnCode = 4;
          log.error( `Failed attempt to login with identifier '${ identifier }'` );
          return callback( error, null );
        }

        const access_garanted : boolean = await bcrypt.compare( password, result.password );
        if( !access_garanted ){
          log.error( `Failed attempt to login with identifier '${ identifier }'` );
        }
        return callback( null, access_garanted );
      }
    } );

    const server = require( 'tls' ).createServer( options, mqtt.handle );

    server.listen( port, () => {
      const message : string = `BeeR MQTT server listening on port ${port}`;
      log.info( message );
    } );

  }catch( error ){
    log.error( error );
    throw error;
  }
}

try{
  init();
}catch( error ){
  console.error( error );
}