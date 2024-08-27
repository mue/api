package database

import (
	"database/sql"
	"log"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

func ConnectDB(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	// Ping the database to ensure the connection is established
	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

func InitDB(db *sql.DB) {
	createTableQuery := `
    CREATE TABLE IF NOT EXISTS quotes (
        id TEXT PRIMARY KEY,
        quote TEXT NOT NULL,
        author TEXT NOT NULL,
        author_occupation TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en'
    );`

	_, err := db.Exec(createTableQuery)
	if err != nil {
		log.Fatalf("Failed to create table: %v", err)
	}

	// Optional: Insert sample data if the table is empty
	row := db.QueryRow("SELECT COUNT(*) FROM quotes")
	var count int
	if err := row.Scan(&count); err != nil {
		log.Fatalf("Failed to count rows: %v", err)
	}

	if count == 0 {
		insertSampleData(db)
	}
}

func insertSampleData(db *sql.DB) {
	insertQuery := `
    INSERT INTO quotes (id, quote, author, author_occupation, language) VALUES 
    (?, ?, ?, ?, ?), 
    (?, ?, ?, ?, ?), 
    (?, ?, ?, ?, ?),
    (?, ?, ?, ?, ?),
    (?, ?, ?, ?, ?),
    (?, ?, ?, ?, ?),
    (?, ?, ?, ?, ?),
    (?, ?, ?, ?, ?),
    (?, ?, ?, ?, ?),
    (?, ?, ?, ?, ?);`

	_, err := db.Exec(insertQuery,
		uuid.New().String(), "The only limit to our realization of tomorrow is our doubts of today.", "Franklin D. Roosevelt", "32nd U.S. President", "en",
		uuid.New().String(), "In the end, we will remember not the words of our enemies, but the silence of our friends.", "Martin Luther King Jr.", "Civil Rights Leader", "en",
		uuid.New().String(), "The greatest glory in living lies not in never falling, but in rising every time we fall.", "Nelson Mandela", "Former President of South Africa", "en",
		uuid.New().String(), "La única limitación para nuestra realización del mañana son nuestras dudas de hoy.", "Franklin D. Roosevelt", "32º Presidente de los EE.UU.", "es",
		uuid.New().String(), "Al final, no recordaremos las palabras de nuestros enemigos, sino el silencio de nuestros amigos.", "Martin Luther King Jr.", "Líder de los Derechos Civiles", "es",
		uuid.New().String(), "La mayor gloria en la vida no radica en no caer nunca, sino en levantarnos cada vez que caemos.", "Nelson Mandela", "Ex Presidente de Sudáfrica", "es",
		uuid.New().String(), "La seule limite à notre réalisation de demain est nos doutes d'aujourd'hui.", "Franklin D. Roosevelt", "32e Président des États-Unis", "fr",
		uuid.New().String(), "À la fin, nous nous souviendrons non pas des mots de nos ennemis, mais du silence de nos amis.", "Martin Luther King Jr.", "Leader des droits civiques", "fr",
		uuid.New().String(), "La plus grande gloire de vivre ne réside pas dans le fait de ne jamais tomber, mais de se relever à chaque fois que nous tombons.", "Nelson Mandela", "Ancien Président de l'Afrique du Sud", "fr",
		uuid.New().String(), "Die einzige Grenze zu unserer Verwirklichung von morgen sind unsere Zweifel von heute.", "Franklin D. Roosevelt", "32. Präsident der USA", "de",
		uuid.New().String(), "Am Ende werden wir uns nicht an die Worte unserer Feinde erinnern, sondern an das Schweigen unserer Freunde.", "Martin Luther King Jr.", "Bürgerrechtsführer", "de",
		uuid.New().String(), "Der größte Ruhm im Leben liegt nicht darin, niemals zu fallen, sondern jedes Mal aufzustehen, wenn wir fallen.", "Nelson Mandela", "Ehemaliger Präsident von Südafrika", "de",
		uuid.New().String(), "唯一限制我们实现明天的，是我们今天的疑虑。", "富兰克林·D·罗斯福", "第32任美国总统", "zh",
		uuid.New().String(), "最终，我们不会记得敌人的话，而是朋友的沉默。", "马丁·路德·金", "民权领袖", "zh",
		uuid.New().String(), "生活中最大的荣耀不是永不跌倒，而是每次跌倒后再度站起来。", "纳尔逊·曼德拉", "前南非总统", "zh",
		uuid.New().String(), "La única limitación para nuestra realización del mañana son nuestras dudas de hoy.", "Franklin D. Roosevelt", "32º Presidente de los EE.UU.", "es",
		uuid.New().String(), "Al final, no recordaremos las palabras de nuestros enemigos, sino el silencio de nuestros amigos.", "Martin Luther King Jr.", "Líder de los Derechos Civiles", "es",
		uuid.New().String(), "La mayor gloria en la vida no radica en no caer nunca, sino en levantarnos cada vez que caemos.", "Nelson Mandela", "Ex Presidente de Sudáfrica", "es",
		uuid.New().String(), "唯一限制我们实现明天的，是我们今天的疑虑。", "富兰克林·D·罗斯福", "第32任美国总统", "zh",
		uuid.New().String(), "最终，我们不会记得敌人的话，而是朋友的沉默。", "马丁·路德·金", "民权领袖", "zh",
		uuid.New().String(), "生活中最大的荣耀不是永不跌倒，而是每次跌倒后再度站起来。", "纳尔逊·曼德拉", "前南非总统", "zh",
		uuid.New().String(), "唯一限制我们实现明天的，是我们今天的疑虑。", "富兰克林·D·罗斯福", "第32任美国总统", "zh",
		uuid.New().String(), "最终，我们不会记得敌人的话，而是朋友的沉默。", "马丁·路德·金", "民权领袖", "zh",
		uuid.New().String(), "生活中最大的荣耀不是永不跌倒，而是每次跌倒后再度站起来。", "纳尔逊·曼德拉", "前南非总统", "zh",
		uuid.New().String(), "唯一限制我们实现明天的，是我们今天的疑虑。", "富兰克林·D·罗斯福", "第32任美国总统", "zh",
		uuid.New().String(), "最终，我们不会记得敌人的话，而是朋友的沉默。", "马丁·路德·金", "民权领袖", "zh",
		uuid.New().String(), "生活中最大的荣耀不是永不跌倒，而是每次跌倒后再度站起来。", "纳尔逊·曼德拉", "前南非总统", "zh",
		uuid.New().String(), "唯一限制我们实现明天的，是我们今天的疑虑。", "富兰克林·D·罗斯福", "第32任美国总统", "zh",
		uuid.New().String(), "最终，我们不会记得敌人的话，而是朋友的沉默。", "马丁·路德·金", "民权领袖", "zh",
		uuid.New().String(), "生活中最大的荣耀不是永不跌倒，而是每次跌倒后再度站起来。", "纳尔逊·曼德拉", "前南非总统", "zh",
	)
	if err != nil {
		log.Fatalf("Failed to insert sample data: %v", err)
	}
}
