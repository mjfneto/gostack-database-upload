import fs from 'fs';
import { getRepository, getCustomRepository } from 'typeorm';
import csvParse from 'csv-parse';

import TransactionsRepository from '../repositories/TransactionsRepository';

import Category from '../models/Category';
import Transaction from '../models/Transaction';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const readStream = fs.createReadStream(filePath);
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const parsers = csvParse({
      from_line: 2,
      trim: true,
    });

    const parseCSV = readStream.pipe(parsers);

    const transactions: Array<CSVTransaction> = [];

    parseCSV.on('data', async row => {
      const [title, type, value, category] = row;

      if (!title || !type || !value) return;

      transactions.push({
        title,
        type,
        value,
        category,
      });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const importedCategoriesTitles = transactions
      .map(({ category }) => category)
      .filter((category, index, self) => self.indexOf(category) === index);

    const existingCategories = await categoriesRepository.find();

    const existingCategoriesTitles = existingCategories.map(
      ({ title }) => title,
    );

    const newCategoriesTitles = importedCategoriesTitles.filter(
      title => !existingCategoriesTitles.includes(title),
    );

    const newImportedCategories = categoriesRepository.create(
      newCategoriesTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newImportedCategories);

    const finalCategories = [...existingCategories, ...newImportedCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(({ title, type, value, category }) => {
        const matchingCategory = finalCategories.find(
          importedCategory => importedCategory.title === category,
        );

        return {
          title,
          type,
          value,
          category: matchingCategory,
        };
      }),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
