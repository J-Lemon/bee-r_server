import Service   from './Service';

const init = async() => {
    const service = await Service.genInstance();

    if( service.isLeft ) return console.error( service.left );
    service.right
        .listenHttp( 8080 )
        .listenMqtt( 1883 );
}

init();
