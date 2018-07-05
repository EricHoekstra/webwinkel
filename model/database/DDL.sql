--
-- DDL voor de webwinkel
--
-- Deze code is niet bedoeld voor in één keer uitvoeren. De database wordt stap-voor-stap opgebouwd uit deze DDL. Dat komt omdat gelijk met het aanmaken van tabellen ook gegevens worden geïmporteerd.
--
-- Bij het schrijven en wijzigingen van deze DDL heeft altijd het datamodel uit het ontwerp naast het toetsenbord gelegen, en beiden zijn consistent gehouden.
--
-- Opmerkingen:
-- * Een kolom gedeclareerd met 'INTEGER PRIMARY KEY' wordt automatisch een alias voor de rowid van SQLite. Een AUTOINCREMENT clause is daarom niet noodzakelijk.

-- Hulptabel omdat Random() soms 'weggeoptimaliseerd' wordt.
CREATE TABLE Willekeur (
	Nummer Integer PRIMARY KEY,
	Nummer_1 Integer,
	Nummer_2 Integer
);

CREATE TABLE Bezoeklog (
	Nummer Integer PRIMARY KEY,
	IpAdres Text,
	Tijdstip Text DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX Bezoeklog_IpAdresTijdstip ON Bezoeklog(IpAdres, Tijdstip);

CREATE TABLE Productgroep (
	Nummer Integer PRIMARY KEY,
	Gcp Text,
	Omschrijving Text,
	ProductgroepType Integer,
	Productgroep Integer,
	CONSTRAINT FK_ProductgroepType FOREIGN KEY (ProductgroepType) REFERENCES ProductgroepType(Nummer),
	CONSTRAINT FK_Productgroep1 FOREIGN KEY (Productgroep) REFERENCES Productgroep(Nummer),
	CONSTRAINT FK_Productgroep2 CHECK (Nummer <> Productgroep)
);
CREATE INDEX Productgroep_Gcp ON Productgroep(Gcp);
CREATE INDEX Productgroep_Productgroep ON Productgroep(Productgroep);

CREATE TABLE ProductgroepType (
	Nummer Integer PRIMARY KEY,
	Naam Text,
	CONSTRAINT Omvang CHECK (Nummer <= 4)
);
INSERT INTO ProductgroepType (Naam) VALUES ("Segment");
INSERT INTO ProductgroepType (Naam) VALUES ("Familie");
INSERT INTO ProductgroepType (Naam) VALUES ("Klasse");
INSERT INTO ProductgroepType (Naam) VALUES ("Bouwsteen");

CREATE TABLE Merk (
	Nummer Integer PRIMARY KEY,
	BSIN Text,
	Naam Text,
	Website Text
);
CREATE UNIQUE INDEX Merk_bsin ON Merk (BSIN);

CREATE TABLE Product (
	Nummer Integer PRIMARY KEY,
	GTIN Text,
	Productnaam Text,
	VerpaktPer Integer,
	Gegevensleverancier Text,
	BSIN Text,
	Merk Integer,
	Productgroep Integer,
	Prijs Real,
	CONSTRAINT FK_Merk FOREIGN KEY (Merk) REFERENCES Merk(nummer),
	CONSTRAINT FK_Productgroep FOREIGN KEY (Productgroep) REFERENCES Productgroep(Nummer)
);
CREATE UNIQUE INDEX Product_gtin ON Product (GTIN);
CREATE INDEX Product_merk ON Product(Merk);
CREATE INDEX Product_productgroep ON Product(Productgroep);
-- Prijzen ontbreken in de POD-data, daarom een willekeurige prijs bepalen.
UPDATE Product SET Prijs = Substr(Random(), 2, 1) || "." || Substr(Random(), 3, 2);

-- Alle nummers uit Productgroep(Nummer) die verbonden kunnen worden aan een product. Productgroepen
-- staan in een hiërarchische verhouding tot elkaar. De diepte is maximaal vier met het segment aan 
-- de top en daaronder: familie, klasse en bouwsteen.
CREATE VIEW Product_Productgroep_Nummer AS
SELECT Nummer FROM (

-- Product is toegekend aan een bouwsteen
SELECT A.Nummer
FROM Productgroep A 
JOIN Productgroep B ON (A.Nummer = B.Productgroep)
JOIN Productgroep C ON (B.Nummer = C.Productgroep)
JOIN Productgroep D ON (C.Nummer = D.Productgroep)
JOIN Product P ON P.Productgroep = D.Nummer

-- Product is toegekend aan een klasse
UNION SELECT B.Nummer
FROM Productgroep B 
JOIN Productgroep C ON (B.Nummer = C.Productgroep)
JOIN Productgroep D ON (C.Nummer = D.Productgroep)
JOIN Product P ON P.Productgroep = D.Nummer

-- Product is toegekend aan een familie
UNION SELECT C.Nummer
FROM Productgroep C 
JOIN Productgroep D ON (C.Nummer = D.Productgroep)
JOIN Product P ON P.Productgroep = D.Nummer

-- Product is toegekend aan een segment
UNION SELECT D.Nummer
FROM Productgroep D 
JOIN Product P ON P.Productgroep = D.Nummer
);

CREATE VIEW Productgroep_Foto AS 
SELECT Productgroep, Foto FROM (

-- Alle foto's die gerelateerd kunnen worden aan een productgroep zonder het tussenvoegen van een tweede productgroep.
SELECT PG1.Nummer AS Productgroep, F.Nummer AS Foto
FROM Productgroep PG1
JOIN Product P ON P.Productgroep = PG1.Nummer
JOIN Foto F ON F.Product = P.Nummer

-- Hetzelfde, maar nu één productgroep tussenvoegen.
UNION SELECT PG1.Nummer, F.Nummer
FROM Productgroep PG1
JOIN Productgroep PG2 ON PG2.Productgroep = PG1.Nummer
JOIN Product P ON P.Productgroep = PG2.Nummer
JOIN Foto F ON F.Product = P.Nummer

-- Twee productgroepen.
UNION SELECT PG1.Nummer, F.Nummer
FROM Productgroep PG1
JOIN Productgroep PG2 ON PG2.Productgroep = PG1.Nummer
JOIN Productgroep PG3 ON PG3.Productgroep = PG2.Nummer
JOIN Product P ON P.Productgroep = PG3.Nummer
JOIN Foto F ON F.Product = P.Nummer

-- Drie productgroepen.
UNION SELECT PG1.Nummer, F.Nummer
FROM Productgroep PG1
JOIN Productgroep PG2 ON PG2.Productgroep = PG1.Nummer
JOIN Productgroep PG3 ON PG3.Productgroep = PG2.Nummer
JOIN Productgroep PG4 ON PG4.Productgroep = PG3.Nummer
JOIN Product P ON P.Productgroep = PG4.Nummer
JOIN Foto F ON F.Product = P.Nummer

);

CREATE TABLE Productexemplaar (
	Nummer Integer PRIMARY KEY,
	Product Integer NOT NULL,
	CONSTRAINT FK_Product FOREIGN KEY (Product) REFERENCES Product(Nummer)
);
CREATE INDEX Productexemplaar_Product ON Productexemplaar(Product);

CREATE TABLE Klant (
	Nummer Integer PRIMARY KEY,
	FactuurAdresGebruiken Integer,
	EmailAdres Text
);
-- Het EmailAdres wordt opgeslagen in klant wanneer geen account bekend is bij de klant.

CREATE TABLE Account (
	Nummer Integer PRIMARY KEY,
	Naam Text,
	EmailAdres Text,
	EmailAdresGeverifieerd Integer,
	Geslacht Text,
	FotoUrl Text,
	Taal Text,
	GoogleSub Text UNIQUE, 
	GoogleAccessToken Text,
	GoogleExpiryDate Integer,
	GoogleRefreshToken Text,
	Geblokkeerd Integer,
	LaatsteInlog Integer,
	Klant Integer NULL,
	CONSTRAINT FK_Klant FOREIGN KEY (Klant) REFERENCES Klant(Nummer)
);
CREATE INDEX Account_Klant ON Account(Klant);
CREATE INDEX Account_EmailAdres ON Account(EmailAdres);

CREATE TABLE Adres (
	Nummer Integer PRIMARY KEY,
	Postcode Text,
	Plaats Text,
	Straatnaam Text,
	Huisnummer Text,
	Toevoeging Text
);
CREATE INDEX Adres_postcode_huisnummer ON Adres (Postcode, Huisnummer);

CREATE TABLE Adrestype (
	Nummer INTEGER PRIMARY KEY,
	Naam Text
);
INSERT INTO Adrestype (Naam) VALUES ("Verzendadres");
INSERT INTO Adrestype (Naam) VALUES ("Factuuradres");

CREATE TABLE Adresklant (
	Nummer Integer PRIMARY KEY,
	Adrestype Integer NOT NULL,
	Klant Integer NOT NULL,
	Adres Integer NOT NULL,
	Afstand Integer,
	CONSTRAINT FK_Adrestype FOREIGN KEY (Adrestype) REFERENCES Adrestype(Nummer),
	CONSTRAINT FK_Adres FOREIGN KEY (Adres) REFERENCES Adres(Nummer),
	CONSTRAINT FK_Klant FOREIGN KEY (Klant) REFERENCES Klant(Nummer)
);
CREATE INDEX Adresklant_Klant_Adrestype ON Adresklant(Klant, Adrestype);
CREATE INDEX Adresklant_Adres ON Adresklant(Adres);

-- Genereren van willekeurige klantadressen, alleen verzendadres.
INSERT INTO Adresklant (Adrestype, Adres, Klant)
SELECT 
	(SELECT Nummer FROM Adrestype WHERE Naam = 'Verzendadres'), 
	A.Nummer,
	K.Nummer
FROM Klant K 
JOIN Willekeur W ON K.Nummer = S.Nummer_1 
JOIN Adres A ON A.Nummer = S.Nummer_2;
--
SELECT AT.Naam, A.Straatnaam, K.Naam 
FROM Adresklant AK
JOIN Adrestype AT ON AT.Nummer = AK.Adrestype
JOIN Adres A ON A.Nummer = AK.Adres
JOIN Klant K ON K.Nummer = AK.Klant

CREATE TABLE Foto (
	Nummer Integer PRIMARY KEY,
	GTIN Text,
	BSIN Text,
	Afbeelding Blob,
	Productgroep Integer,
	Product Integer,
	Productexemplaar Integer,
	Merk Integer,
	CONSTRAINT FK_Productgroep FOREIGN KEY (Productgroep) REFERENCES Productgroep(Nummer),
	CONSTRAINT FK_Product FOREIGN KEY (Product) REFERENCES Product(Nummer),
	CONSTRAINT FK_Productexemplaar FOREIGN KEY (Productexemplaar) REFERENCES Productexemplaar(Nummer),
	CONSTRAINT FK_Merk FOREIGN KEY (Merk) REFERENCES Merk(Nummer)
);
CREATE UNIQUE INDEX Foto_gtin ON Foto (GTIN);
CREATE UNIQUE INDEX Foto_bsin ON Foto (BSIN);
CREATE INDEX Foto_productgroep ON Foto(Productgroep);
CREATE INDEX Foto_product ON Foto(Product);
CREATE INDEX Foto_productexemplaar ON Foto(Productexemplaar);
CREATE INDEX Foto_Merk ON Foto(Merk);
-- Importeren van foto's met het import-afbeeldingen.js script.

CREATE TABLE Verzendkosten (
	Nummer Integer PRIMARY KEY,
	Prijs Real NOT NULL CONSTRAINT Prijs_constraint6 CHECK (Prijs >= 0),
	Afstand Integer NOT NULL CONSTRAINT Afstand_constraint7 CHECK (Afstand >= 0), -- in meters
	Kosten Real NOT NULL CONSTRAINT Kosten_constraint6 CHECK (Kosten >= 0)
);
CREATE UNIQUE INDEX Verzendkosten_constraint5 ON Verzendkosten(Prijs, Afstand);
INSERT INTO Verzendkosten (Afstand, Prijs, Kosten) VALUES (    0,  0, 1.00);
INSERT INTO Verzendkosten (Afstand, Prijs, Kosten) VALUES (    0, 15, 0.00); 
INSERT INTO Verzendkosten (Afstand, Prijs, Kosten) VALUES (10000,  0, 1.10);
INSERT INTO Verzendkosten (Afstand, Prijs, Kosten) VALUES (40000,  0, 1.40);
INSERT INTO Verzendkosten (Afstand, Prijs, Kosten) VALUES (70000,  0, 1.70);

CREATE TABLE Bestelling (
	Nummer Integer PRIMARY KEY,
	Klant Integer NOT NULL,
	Tijdstip Text DEFAULT CURRENT_TIMESTAMP,
	Verzendkosten Integer,
   CONSTRAINT FK_Verzendkosten FOREIGN KEY (Verzendkosten) REFERENCES Verzendkosten(Nummer),
	CONSTRAINT FK_Klant FOREIGN KEY (Klant) REFERENCES Klant(Nummer)
);
CREATE INDEX Bestelling_Verzendkosten ON Bestelling(Verzendkosten);
CREATE INDEX Bestelling_Klant ON Bestelling(Klant);

-- Voor ieder productexemplaar wordt een bestelregel aangemaakt. Het attribuut teken geeft aan
-- of het productexemplaar wordt toegevoegd of juist tegengeboekt op de bestelling.
CREATE TABLE Bestelregel (
	Nummer Integer PRIMARY KEY,
	Bestelling Integer NOT NULL,
	Productexemplaar Integer NOT NULL,
	Teken Integer CONSTRAINT Teken_domein CHECK (Teken = -1 OR Teken = 1),
	Prijs Real NOT NULL,
	CONSTRAINT FK_Bestelling FOREIGN KEY (Bestelling) REFERENCES Bestelling(Nummer),
	CONSTRAINT FK_Productexemplaar FOREIGN KEY (Productexemplaar) REFERENCES Productexemplaar(Nummer)
);
CREATE INDEX Bestelregel_Bestelling ON Bestelregel(Bestelling);
CREATE INDEX Bestelregel_Productexemplaar ON Bestelregel(Productexemplaar, Teken);

CREATE TABLE Factuur (
	Nummer Integer PRIMARY KEY,
	Kortingscode Text,
	Bestelling Integer,
	CONSTRAINT FK_Bestelling FOREIGN KEY (Bestelling) REFERENCES Bestelling(Nummer)
);
CREATE INDEX Factuur_Bestelling ON Factuur(Bestelling);

CREATE TABLE Factuurregel (
   Nummer Integer PRIMARY KEY,
   Factuur Integer NOT NULL,
   Bestelregel Integer,
   Verzendkosten Integer,
   Bedrag Real NOT NULL,
   Teken Integer CONSTRAINT Teken_domein CHECK (Teken = -1 OR Teken = 1),
   CONSTRAINT FK_Factuur FOREIGN KEY (Factuur) REFERENCES Factuur(Nummer),
   CONSTRAINT FK_Bestelregel FOREIGN KEY (Bestelregel) REFERENCES Bestelregel(Nummer),
   CONSTRAINT FK_Verzendkosten FOREIGN KEY (Verzendkosten) REFERENCES Verzendkosten(Nummer),
   CONSTRAINT Bestelregel_Verzendkosten_Not_Null CHECK (Bestelregel IS NOT NULL OR Verzendkosten IS NOT NULL)
);
CREATE INDEX Factuurregel_Bestelregel ON Factuurregel(Bestelregel);
CREATE INDEX Factuurregel_Verzendkosten ON Factuurregel(Verzendkosten);
CREATE INDEX Factuurregel_Factuur ON Factuurregel(Factuur);

CREATE TABLE Betaling (
	Nummer Integer PRIMARY KEY,
	Factuur Integer NOT NULL,
	Referentie Text,
	Bedrag Real,
	Teken Integer CONSTRAINT Teken_domein CHECK (Teken = -1 OR Teken = 1),
	CONSTRAINT FK_Factuur FOREIGN KEY (Factuur) REFERENCES Factuur(Nummer)
);
CREATE INDEX Betaling_Factuur ON Betaling(Factuur);

CREATE TABLE Verzending (
   Nummer Integer PRIMARY KEY,
   Adresklant Integer NOT NULL,
   Afgeleverd Integer,
   CONSTRAINT FK_Adresklant FOREIGN KEY (Adresklant) REFERENCES Adresklant(Nummer)
);
CREATE INDEX Verzending_Adresklant ON Verzending(Adresklant);

CREATE TABLE Verzendregel (
   Nummer Integer PRIMARY KEY,
   Verzending Integer NOT NULL,
   Bestelregel Integer NOT NULL,
   CONSTRAINT FK_Verzending FOREIGN KEY (Verzending) REFERENCES Verzending(Nummer),
   CONSTRAINT FK_Bestelregel FOREIGN KEY (Bestelregel) REFERENCES Bestelregel(Nummer)
);
CREATE INDEX Verzendregel_Verzending ON Verzendregel(Verzending);
CREATE INDEX Verzendregel_Bestelregel ON Verzendregel(Bestelregel);

CREATE TABLE Rapport (
	Nummer Integer PRIMARY KEY,
	Naam Text,
	Omschrijving Text,
	Broncode Text
);
INSERT OR REPLACE INTO Rapport (Nummer, Naam, Omschrijving, Broncode) VALUES (1, "Voorraden", "De actuele voorraadstand per productgroep. Alleen producten die voorkomen in een productgroep en waarvan een foto is worden geteld.", "SELECT PG.Omschrijving AS Productgroep_Omschrijving, (SELECT Count(*) FROM Productexemplaar PE JOIN Product P ON P.Nummer = PE.Product WHERE P.Productgroep = PG.Nummer) - (SELECT Coalesce(Sum(Teken), 0) FROM Bestelregel BR JOIN Productexemplaar PE ON PE.Nummer = BR.Productexemplaar JOIN Product P ON P.Nummer = PE.Product WHERE P.Productgroep = PG.Nummer) AS Productexemplaren_Voorraad FROM Productgroep PG JOIN Product P ON P.Productgroep = PG.Nummer GROUP BY PG.Nummer, PG.Omschrijving ORDER BY 2 DESC;");
INSERT OR REPLACE INTO Rapport (Nummer, Naam, Omschrijving, Broncode) VALUES (2, "Klanten en bestellingen", "Sommige klanten hebben een account. Wanneer een bezoeker een bestelling zonder account plaatst, dan wordt een nieuwe klant aangemaakt. Bestellingen kunnen niet verder komen dan de winkelwagen, in dat geval zijn deze niet betaald. Afgeronde bestellingen zijn betaald.", "SELECT Count(DISTINCT K.Nummer) AS Klanten, Count(DISTINCT A.Nummer) AS Accounts, Count(DISTINCT B.Nummer) AS Bestellingen, Count(DISTINCT F.Nummer) AS Facturen, Count(DISTINCT BET.Nummer) AS Betalingen FROM Klant K LEFT JOIN Account A ON K.Nummer = A.Klant LEFT JOIN Bestelling B ON B.Klant = K.Nummer LEFT JOIN Factuur F ON F.Bestelling = B.Nummer LEFT JOIN Betaling BET ON BET.Factuur = F.Nummer");
INSERT OR REPLACE INTO Rapport (Nummer, Naam, Omschrijving, Broncode) VALUES (3, "Klanten met een account", "Bestellen kan mét en zonder account. De volgende klanten maakten een account aan. Een bestelling kan nog lopend zijn.", "SELECT Naam, A.EmailAdres, Geslacht, Taal, (SELECT Count(*) FROM Bestelling B WHERE B.Klant = K.Nummer) AS Bestellingen, (SELECT Count(*) FROM Bestelling B JOIN Factuur F ON F.Bestelling = B.Nummer WHERE B.Klant = K.Nummer) AS Facturen, (SELECT Count(*) FROM Bestelling B JOIN Factuur F ON F.Bestelling = B.Nummer JOIN Betaling BE ON BE.Factuur = F.Nummer WHERE B.Klant = K.Nummer) AS Betalingen FROM Account A JOIN Klant K ON K.Nummer = A.Klant"); 
INSERT OR REPLACE INTO Rapport (Nummer, Naam, Omschrijving, Broncode) VALUES (4, "E-mailadressen zonder account", "Klanten zonder account geven een e-mailadres op. Hoe vaak kwam dat adres voor in de accounts?", "SELECT DISTINCT K.EmailAdres, Count(*) AS Aantal, (SELECT Count(*) FROM Account A WHERE A.Emailadres Like K.Emailadres) AS KomtVoorInAccount FROM Klant K WHERE K.EmailAdres IS NOT NULL GROUP BY K.EmailAdres");
INSERT OR REPLACE INTO Rapport (Nummer, Naam, Omschrijving, Broncode) VALUES (5, "Vergeten bestellingen", "Een bestelling zonder factuur is een lopende bestelling. Bestellingen van de vorige dag die nog lopend zijn worden als vergeten door de klant beschouwd.", "SELECT Min(Tijdstip) AS Bestelling_Tijdstip_Min, Max(Tijdstip) AS Bestelling_Tijdstip_Max, Count(*) AS Bestelling_Aantal FROM Bestelling B WHERE NOT EXISTS (SELECT * FROM Factuur F WHERE F.Bestelling = B.Nummer) AND Date(Tijdstip) < Date('now')");
INSERT OR REPLACE INTO Rapport (Nummer, Naam, Omschrijving, Broncode) VALUES (6, "Betaalde bestellingen", "Een betaling wordt altijd verwerkt, maar het betaalde bedrag kan te weinig zijn om de factuur te dekken. Eén dubbeltje verschil ten gunste van de klant mag.", "SELECT B.Nummer AS Bestelling, (SELECT Sum(BR.Teken) FROM Bestelregel BR WHERE BR.Bestelling = B.Nummer) AS Bestelregels, (SELECT Kosten FROM Verzendkosten VK WHERE VK.Nummer = B.Verzendkosten) AS Verzendkosten, F.Nummer AS Factuur, (SELECT Sum(FR.Bedrag * FR.Teken) FROM Factuurregel FR WHERE FR.Factuur = F.Nummer) AS Factuur, (SELECT Sum(BE.Bedrag * BE.Teken) FROM Betaling BE WHERE BE.Factuur = F.Nummer) AS Betaling, Round((SELECT Sum(FR.Bedrag * FR.Teken) FROM Factuurregel FR WHERE FR.Factuur = F.Nummer) - (SELECT Sum(BE.Bedrag * BE.Teken) FROM Betaling BE WHERE BE.Factuur = F.Nummer), 4) AS Verschil, Case When (SELECT Sum(FR.Bedrag * FR.Teken) FROM Factuurregel FR WHERE FR.Factuur = F.Nummer) - (SELECT Sum(BE.Bedrag * BE.Teken) FROM Betaling BE WHERE BE.Factuur = F.Nummer) < 0.10 Then 'Ja' Else 'Nee' End AS Betaald FROM Bestelling B JOIN Factuur F ON F.Bestelling = B.Nummer ORDER BY F.Bestelling;");

CREATE TABLE Opdracht (
	Nummer Integer PRIMARY KEY,
	Naam Text,
	Omschrijving Text,
	Broncode Text,
	Rapport Text
);
INSERT OR REPLACE INTO Opdracht (Nummer, Naam, Omschrijving, Broncode, Rapport) VALUES (1, "Vergeten bestellingen verwijderen", "Een bestelling is vergeten wanneer deze ongefactureerd is en de vorige kalenderdag geplaatst. Klanten aangemaakt voor anonieme bezoekers, worden niet verwijderd.", "DELETE FROM Bestelregel WHERE Bestelling IN (SELECT B.Nummer FROM Bestelling B WHERE B.Nummer NOT IN (SELECT F.Bestelling FROM Factuur F) AND Date(B.Tijdstip) < Date('now')); DELETE FROM Bestelling WHERE Date(Tijdstip) < Date('now') AND Nummer NOT IN (SELECT F.Bestelling FROM Factuur F);", "SELECT (SELECT Count(*) FROM Bestelling B WHERE B.Nummer IN (SELECT Bestelling FROM Factuur)) AS Bestelling_Gefactureerd, (SELECT Count(*) FROM Bestelling B WHERE B.Nummer NOT IN (SELECT Bestelling FROM Factuur)) AS Bestelling_Ongefactureerd, (SELECT Count(*) FROM Bestelling B WHERE NOT EXISTS (SELECT * FROM Factuur F WHERE F.Bestelling = B.Nummer) AND Date(Tijdstip) < Date('now')) AS Bestelling_Vergeten;");
INSERT OR REPLACE INTO Opdracht (Nummer, Naam, Omschrijving, Broncode, Rapport) VALUES (2, "Alle bestellingen verwijderen", "Verwijder ALLE bestellingen en gerelateerde gegevens, van alle klanten, uit heel de database. Anonieme klanten worden verwijderd. Geregistreerde klanten (account) blijven behouden. Het controlegetal moet 0 zijn. Wanneer dat getal > 0 dan zijn niet alle records verwijderd. (De query moet nog aangepast worden zodat constraint 4 niet uitgevoerd wordt tijdens het verwijderen.)", "DELETE FROM Verzendregel; DELETE FROM Verzending; DELETE FROM Betaling; DELETE FROM Factuurregel; DELETE FROM Factuur; DELETE FROM Bestelregel; DELETE FROM Adresklant; DELETE FROM Bestelling; DELETE FROM Klant WHERE Nummer NOT IN (SELECT Klant FROM Account);", "SELECT (SELECT Count(*) FROM Klant WHERE Nummer NOT IN (SELECT Klant FROM Account)) + (SELECT Count(*) FROM Bestelling) + (SELECT Count(*) FROM Bestelregel) + (SELECT Count(*) FROM Factuurregel) + (SELECT Count(*) FROM Factuur) + (SELECT Count(*) FROM Betaling) + (SELECT Count(*) FROM Adresklant WHERE Klant NOT IN (SELECT Klant FROM Account) + (SELECT Count(*) FROM Verzendregel) + (SELECT Count(*) FROM Verzending)) AS Controlegetal");
INSERT OR REPLACE INTO Opdracht (Nummer, Naam, Omschrijving, Broncode, Rapport) VALUES (3, "Alle verzendingen verwijderen", "Verwijder alle verzendingen, hierdoor moeten bestellingen opnieuw bezorgd worden. Als het controlegetal 0 is, dan zijn alle verzendingen verwijderd.", "DELETE FROM Verzendregel; DELETE FROM Verzending", "SELECT (SELECT Count(*) FROM Verzending) + (SELECT Count(*) FROM Verzendregel) AS Controlegetal");

-- Zie ontwerp onder 'Gegevensmodel', triggers nodig voor constraint 3.
CREATE TRIGGER Factuurregel_constraint3
AFTER INSERT ON Factuurregel FOR EACH ROW 
BEGIN
	SELECT RAISE(ROLLBACK, 'Constraint 3 op Factuurregel: de factuurregel verwijst via Bestelregel naar een andere Bestelling dan via Factuur.')
	FROM Factuurregel_constraint3 FR_constraint3
	WHERE FR_constraint3.Factuurregel = NEW.Nummer;
END;

CREATE TRIGGER Bestelregel_constraint3
AFTER UPDATE OF Bestelling ON Bestelregel FOR EACH ROW 
BEGIN
	SELECT RAISE(ROLLBACK, 'Constraint 3 op Factuurregel: de factuurregel verwijst via Bestelregel naar een andere Bestelling dan via Factuur.')
	FROM Factuurregel_constraint3 FR_constraint3
	WHERE FR_constraint3.Bestelregel = NEW.Nummer;
END;

CREATE TRIGGER Factuur_constraint3
AFTER UPDATE OF Bestelling ON Factuur FOR EACH ROW 
BEGIN
	SELECT RAISE(ROLLBACK, 'Constraint 3 op Factuurregel: de factuurregel verwijst via Bestelregel naar een andere Bestelling dan via Factuur.')
	FROM Factuurregel_constraint3 FR_constraint3
	WHERE FR_constraint3.Factuur = NEW.Nummer;
END;

-- Constraint 3, invariant, de verzameling moet leeg zijn.
CREATE VIEW Factuurregel_constraint3 AS
SELECT 
	B1.Nummer AS Bestelling1, B2.Nummer AS Bestelling2, 
	F.Nummer AS Factuur, FR.Nummer AS Factuurregel, BR.Nummer AS Bestelregel
FROM 
	Factuurregel FR
	JOIN Bestelregel BR ON BR.Nummer = FR.Bestelregel 
	JOIN Bestelling B1 ON B1.Nummer = BR.Bestelling
	JOIN Factuur F ON F.Nummer = FR.Factuur 
	JOIN Bestelling B2 ON B2.Nummer = F.Bestelling
WHERE B1.Nummer != B2.Nummer;

-- Testsetje, preconditie: Klant(Nummer) = 1 is waar in de database, Bestelling(Nummer) = 1000 is niet waar, enz.
INSERT INTO Bestelling (Nummer, Klant) VALUES (1000, 1);
INSERT INTO Bestelling (Nummer, Klant) VALUES (1001, 1);
INSERT INTO Bestelregel (Nummer, Bestelling, Productexemplaar, Prijs) VALUES (10000, 1000, (SELECT Nummer FROM Productexemplaar LIMIT 1), 1.00);
INSERT INTO Factuurregel(Bestelregel, Factuur, Bedrag) VALUES (10000, 1000, 1.00);
INSERT INTO Factuur(Nummer, Bestelling) VALUES (1000, 1000);

-- Forceren van constraint 4, zie in het ontwerp. Werkt alle openstaande (niet gefactureerde) bestellingen van de klant uit Adresklant bij.
CREATE TRIGGER Adresklant_constraint4_1
AFTER INSERT ON Adresklant
BEGIN
   UPDATE Bestelling SET Verzendkosten = 
      (SELECT Verzendkosten_Nummer 
      FROM Bestelling_constraint4 BC4
      WHERE BC4.Bestelling_Nummer = Bestelling.Nummer)
   WHERE Bestelling.Nummer IN (
         SELECT B.Nummer 
         FROM Bestelling B 
         WHERE B.Klant = NEW.Klant
            AND B.Nummer NOT IN (SELECT Bestelling FROM Factuur)
      );
END;

CREATE TRIGGER Adresklant_constraint4_2
AFTER UPDATE OF Afstand ON Adresklant
BEGIN
   UPDATE Bestelling SET Verzendkosten = 
      (SELECT Verzendkosten_Nummer 
      FROM Bestelling_constraint4 BC4
      WHERE BC4.Bestelling_Nummer = Bestelling.Nummer)
   WHERE Bestelling.Nummer IN (
         SELECT B.Nummer 
         FROM Bestelling B 
         WHERE B.Klant = NEW.Klant
            AND B.Nummer NOT IN (SELECT Bestelling FROM Factuur)
      );
END;

CREATE TRIGGER Bestelregel_constraint4_1
AFTER INSERT ON Bestelregel
BEGIN
   UPDATE Bestelling SET Verzendkosten = 
      (SELECT Verzendkosten_Nummer 
      FROM Bestelling_constraint4 BC4
      WHERE BC4.Bestelling_Nummer = Bestelling.Nummer)
   WHERE Bestelling.Nummer = NEW.Bestelling;
END;

CREATE TRIGGER Bestelregel_constraint4_2
AFTER DELETE ON Bestelregel
BEGIN
   UPDATE Bestelling SET Verzendkosten = 
      (SELECT Verzendkosten_Nummer 
      FROM Bestelling_constraint4 BC4
      WHERE BC4.Bestelling_Nummer = Bestelling.Nummer)
   WHERE Bestelling.Nummer = OLD.Bestelling;
END;

-- Constraint 4, afleiding van de verzendkosten. Levert een verzameling met bestellingnummers en verzendkosten op. Zie ontwerp!
CREATE VIEW Bestelling_constraint4 AS 
SELECT 
   B.Bestelling_Nummer, 
   (
      SELECT R.Nummer FROM Verzendkosten R
      WHERE 
         -- De eerste voorwaarde waarmee de equivalentieklasse wordt gedefinieerd.
         B.Bestelling_Prijs >= R.Prijs AND B.Adresklant_Afstand >= R.Afstand 
         -- De tweede voorwaarde van die definitie.
         AND NOT EXISTS (
            SELECT * FROM Verzendkosten S
            WHERE 
               B.Bestelling_Prijs >= S.Prijs AND B.Adresklant_Afstand >= S.Afstand 
               AND (R.Prijs < S.Prijs OR (R.Prijs = S.Prijs AND R.Afstand <= S.Afstand)) -- R gaat vooraf S
               AND NOT (R.Prijs = S.Prijs AND R.Afstand = S.Afstand) -- R is geen S
         )
   ) AS Verzendkosten_Nummer,
   B.Bestelling_Prijs,
   B.Adresklant_Afstand
FROM Bestelling_Prijs_Afstand B;

-- Hulpview om de logica van Bestelling_constraint4 te vereenvoudigen. Kan ook los van die view gebruikt worden. Versie 3.6.20 van Sqlite ondersteunt nog geen CTE's.
CREATE VIEW Bestelling_Prijs_Afstand AS
SELECT 
   -- De bestelling
   B.Nummer AS Bestelling_Nummer,  
   -- de prijs van de bestelling
   Coalesce((
      SELECT Sum(BR.Prijs * BR.Teken) 
      FROM Bestelregel BR 
      WHERE BR.Bestelling = B.Nummer
   ), 0) AS Bestelling_Prijs,
   -- en de afstand tot het verzendadres.
   Coalesce((
      SELECT Afstand 
      FROM Adresklant AK JOIN Adrestype AT ON AT.Nummer = AK.Adrestype 
      WHERE AK.Klant = B.Klant AND AT.Naam = 'Verzendadres'
      ORDER BY AK.Nummer DESC LIMIT 1
   ), 0) AS Adresklant_Afstand
FROM Bestelling B
UNION SELECT -1, Bestelling_Prijs, Adresklant_Afstand 
FROM Bestelling_Prijs_Afstand_Invoer;

-- Tabel handig voor het controleren van de verzendkostentabel in de bedrijfsleiderclient.
CREATE TABLE Bestelling_Prijs_Afstand_Invoer (
   Bestelling_Prijs Real CONSTRAINT Bestelling_Prijs_constraint6 CHECK (Bestelling_Prijs >= 0),
   Adresklant_Afstand Integer CONSTRAINT Adresklant_Afstand_constraint6 CHECK (Adresklant_Afstand >= 0)
);

-- Uitlijsten van de lineaire ordening; een Hasse-diagram in tabelvorm. Als oefening geschreven, nog geen toepassing in deze applicatie, en zal het ook niet krijgen, want met een ORDER BY kan eenvoudiger hetzelfde resultaat worden bereikt! (Voor deze ordening tenminste.)
SELECT R.Prijs, R.Afstand, R.Kosten, 
   (
      SELECT Count(*) FROM Verzendkosten S
      WHERE (S.Prijs < R.Prijs OR (S.Prijs = R.Prijs AND S.Afstand <= R.Afstand)) -- S gaat vooraf aan R
   ) AS Volgnummer
FROM Verzendkosten R
ORDER BY Volgnummer;

-- Hulpview voor de controle van constraint 8, invariant, de verzameling moet leeg zijn.
CREATE VIEW Verzendkosten_constraint8 AS
SELECT 'Constraint 8 onwaar' WHERE NOT EXISTS (SELECT * FROM Verzendkosten WHERE Prijs = 0 AND Afstand = 0 AND Kosten IS NOT NULL);

-- Controle van constraint 8, invariant, na het toevoegen aan Verzendkosten. Noot: De view Verzendksoten_constraint8 'kijkt' al naar de gewijzigde database.
CREATE TRIGGER Verzendkosten_constraint8_1
AFTER INSERT ON Verzendkosten FOR EACH ROW 
BEGIN
	SELECT RAISE(ROLLBACK, 'Constraint 8 op Verzendkosten: de verzendkostentabel moet tenminste één rij bevatten met Prijs = 0, Afstand = 0 en een zekere waarde voor de Verzendkosten.')
	FROM Verzendkosten_constraint8;
END;

-- Constraint 8, idem., wijzigen
CREATE TRIGGER Verzendkosten_constraint8_2
AFTER UPDATE OF Prijs, Afstand ON Verzendkosten FOR EACH ROW 
BEGIN
	SELECT RAISE(ROLLBACK, 'Constraint 8 op Verzendkosten: de verzendkostentabel moet tenminste één rij bevatten met Prijs = 0, Afstand = 0 en een zekere waarde voor de Verzendkosten.')
	FROM Verzendkosten_constraint8;
END;

-- Constraint 9, idem., verwijderen
CREATE TRIGGER Verzendkosten_constraint8_3
AFTER DELETE ON Verzendkosten FOR EACH ROW
BEGIN
	SELECT RAISE(ROLLBACK, 'Constraint 8 op Verzendkosten: de verzendkostentabel moet tenminste één rij bevatten met Prijs = 0, Afstand = 0 en een zekere waarde voor de Verzendkosten.')
	FROM Verzendkosten_constraint8;
END;
