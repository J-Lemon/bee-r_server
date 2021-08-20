import * as argon2d                                 from 'argon2';
import { Length, IsString, IsIP }                   from 'class-validator';
import { Entity, PrimaryGeneratedColumn, OneToMany,
         Column, BeforeInsert }                     from "typeorm";
import { Either, left, right }                      from "tsmonads";
import { AuthenticateError }                        from 'aedes';
import Metric                                       from './Metric';

@Entity()
export default class Hive {
    @PrimaryGeneratedColumn()
    id: number;

    @Column( { unique: true } )
    @IsString()
    @Length( 8, 16 )
    identifier: string;

    @Column()
    @IsString()
    @Length( 8, 28 )
    password: string;

    @OneToMany( type => Metric, metric => metric.id, {cascade: true} )
    metrics: Metric[];

    public async hashPassword(): Promise< void > {
        try{
            this.password = await argon2d.hash( this.password );
        }catch( error ){
            throw error;
        }
    }

    @BeforeInsert()
    private async befeoreInsert() {
        try{
            await this.hashPassword();
        }catch( error ){
            throw error;
        }
    }

    public async comparePassword( password: string ): Promise< Either< AuthenticateError, boolean > > {
        try{
            if( typeof this.id != 'undefined' )
                return right( await argon2d.verify( this.password, password ) );
            return left( { ...new Error( `Cannot compare an not hashed password` ), returnCode: 4 } );
        }catch( error ){
            return left(  { ...error, returnCode: 4 }  );
        }
    }
}