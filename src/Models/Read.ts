import { IsPositive, MinLength, Max } from 'class-validator';
import { Entity, PrimaryGeneratedColumn, Column }  from "typeorm";

@Entity()
export default class Read {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @IsPositive()
    @Max( 40 )
    sensor_id: number;

    @Column()
    @MinLength( 1 )
    value: string;
}