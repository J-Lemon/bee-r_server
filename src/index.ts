import fs     from 'fs';
import aedes  from 'aedes';
import dotenv from 'dotenv';

dotenv.config();

const port = parseInt( process.env.PORT! );

const options = {
  key:  fs.readFileSync( process.env.KEY_PEM! ),
  cert: fs.readFileSync( process.env.CRT_PEM! )
};

const server = require('tls').createServer( options, aedes().handle );

server.listen( port, () => {
  console.log( 'server started and listening on port ', port );
} );