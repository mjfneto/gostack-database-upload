import { getCustomRepository } from 'typeorm';

import TransactionsRepository from '../repositories/TransactionsRepository';

// import AppError from '../errors/AppError';

interface RequestDTO {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: RequestDTO): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    await transactionsRepository.delete(id);
  }
}

export default DeleteTransactionService;
