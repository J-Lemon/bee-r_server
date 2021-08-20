import Read from './Read';
import Hive from './Hive';
import { IsPositive, IsDate } from 'class-validator';
import { Entity, PrimaryGeneratedColumn, ManyToOne,
         Column, OneToMany, JoinTable }  from "typeorm";

@Entity()
export default class Metric {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @IsDate()
    date: string;

    @OneToMany( () => Read, read => read.metric, {cascade: true} )
    reads: Read[];

    @ManyToOne( () => Hive, hive => hive.metrics)
    hive: Hive;
}