# sist_catalogos Project

## Overview
The `sist_catalogos` project is designed to manage various entities such as gremios, EOTs, and holidays (feriados) using a structured database approach. It utilizes SQLAlchemy for ORM (Object-Relational Mapping) to define the database models and manage interactions with the database.

## Project Structure
```
sist_catalogos
├── backend
│   ├── models.py          # Contains SQLAlchemy models for the database.
│   ├── revert_db_init.py  # Script to revert the database initialization.
└── README.md              # Documentation for the project.
```

## Setup Instructions
1. **Clone the Repository**
   ```
   git clone <repository-url>
   cd sist_catalogos
   ```

2. **Install Dependencies**
   Ensure you have Python and pip installed. Then, install the required packages:
   ```
   pip install -r requirements.txt
   ```

3. **Database Initialization**
   To initialize the database, run the following command:
   ```
   python backend/models.py
   ```

4. **Reverting Database Initialization**
   If you need to revert the database initialization without affecting the existing tables (`gremios`, `eots`, `feriados`), execute:
   ```
   python backend/revert_db_init.py
   ```

## Usage
- The project is designed to manage users, roles, permissions, and other entities through a secure and structured approach.
- Refer to the individual model files for detailed information on the structure and relationships of the database tables.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.