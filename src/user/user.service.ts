import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    async findAll() {
        return this.userRepo.find({
            order: { createdAt: 'ASC' },
            select: ['id', 'email', 'displayName'],
        });
    }

    async findOne(id: string) {
        return this.userRepo.findOne({ where: { id } });
    }
}
