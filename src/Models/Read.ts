import { MinLength, Max, Min } from 'class-validator';
import {Entity, PrimaryGeneratedColumn, Column, ManyToOne} from "typeorm";
import Metric from './Metric';

@Entity()
export default class Read {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Min( 0 )
    @Max( 40 )
    sensor_id: number;

    @Column()
    @MinLength( 1 )
    value: string;

    @ManyToOne( () => Metric, metric => metric.reads)
    metric: Metric;
}