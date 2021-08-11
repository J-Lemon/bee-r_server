import Read from './Read';
import Hive from './Hive';
import { Length, IsString, IsIP, IsPositive, IsDate } from 'class-validator';
import { Entity, PrimaryGeneratedColumn, ManyToOne,
         Column, BeforeUpdate, UpdateEvent, OneToMany }  from "typeorm";

@Entity()
export default class Metric {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @IsPositive()
    metric_id: number;

    @Column( { unique: true } )
    @IsDate()
    date: string;

    @OneToMany( () => Read, read => read.id)
    reads: Read[];

    @ManyToOne( () => Hive, hive => hive.metrics)
    hive: Hive;
}