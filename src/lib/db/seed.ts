import bcrypt from "bcryptjs";
import { db } from "./client.ts";

/**
 * Seeds the database with FICTIONAL sample data only.
 * All names, brands, companies, and case details are invented.
 * Safe to re-run: it wipes the tables first (RESTART IDENTITY CASCADE).
 */

async function seed() {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `TRUNCATE TABLE cases, teams, investigators, users, remarks, reviews,
       activity_logs, case_documents, import_batches RESTART IDENTITY CASCADE`
    );

    // -------------------------------------------------------------
    // TEAMS
    // -------------------------------------------------------------
    const teams = [
      ["Counterfeit Goods", "Investigations into counterfeit physical goods"],
      ["Trademark Enforcement", "Trademark infringement and brand protection"],
      ["Digital Brand Protection", "Online listings, domains, and digital infringements"],
      ["Legal Operations", "Case coordination, reviews, and reporting"],
    ];
    const teamIds: Record<string, number> = {};
    for (const [name, description] of teams) {
      const r = await client.query(
        `INSERT INTO teams (name, description) VALUES ($1, $2) RETURNING id`,
        [name, description]
      );
      teamIds[name] = r.rows[0].id;
    }

    // -------------------------------------------------------------
    // INVESTIGATORS
    // -------------------------------------------------------------
    const investigators = [
      ["Sofia Ramirez", "sofia.ramirez@cmg.internal", "Counterfeit Goods"],
      ["Marcus Chen", "marcus.chen@cmg.internal", "Counterfeit Goods"],
      ["Amelia Osei", "amelia.osei@cmg.internal", "Trademark Enforcement"],
      ["Daniel Kowalski", "daniel.kowalski@cmg.internal", "Trademark Enforcement"],
      ["Priya Natarajan", "priya.natarajan@cmg.internal", "Digital Brand Protection"],
      ["Tom Becker", "tom.becker@cmg.internal", "Digital Brand Protection"],
      ["Yusuf Demir", "yusuf.demir@cmg.internal", "Legal Operations"],
    ];
    const investigatorIds: Record<string, number> = {};
    for (const [name, email, team] of investigators) {
      const r = await client.query(
        `INSERT INTO investigators (name, email, team_id) VALUES ($1, $2, $3) RETURNING id`,
        [name, email, teamIds[team]]
      );
      investigatorIds[name] = r.rows[0].id;
    }

    // -------------------------------------------------------------
    // USERS (no auth UI yet, but rows must satisfy FK + NOT NULL hash)
    // -------------------------------------------------------------
    const passwordHash = bcrypt.hashSync("cmg-password-2026", 10);
    const users = [
      ["Alex Carter", "admin@cmg.internal", "admin", "Legal Operations"],
      ["Jordan Lee", "manager@cmg.internal", "manager", "Counterfeit Goods"],
      ["Sofia Ramirez", "sofia.ramirez@cmg.internal", "team_member", "Counterfeit Goods"],
      ["Priya Natarajan", "priya.natarajan@cmg.internal", "team_member", "Digital Brand Protection"],
      ["Nadia Hassan", "reporting@cmg.internal", "reporting", "Legal Operations"],
      ["Chris Turner", "viewer@cmg.internal", "viewer", "Legal Operations"],
    ];
    const userIds: Record<string, number> = {};
    for (const [name, email, role, team] of users) {
      const r = await client.query(
        `INSERT INTO users (name, email, password_hash, role, team_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [name, email, passwordHash, role, teamIds[team]]
      );
      userIds[name] = r.rows[0].id;
    }

    // -------------------------------------------------------------
    // CASES
    // -------------------------------------------------------------
    const cases = [
      {
        cmg: "CMG-2024-0001", clientRef: "ARO-1123", title: "Counterfeit Aurora Luxe watches seized at port",
        type: "Counterfeit", target: "Evergreen Distribution Ltd.", owner: "Robert Hale", location: "Port of Rotterdam",
        city: "Rotterdam", address: "Dock 14, Maasvlakte", contact: "r.hale@evergreen-dist.example",
        brand: "Aurora Luxe", clientName: "Aurora Timepieces SA", team: "Counterfeit Goods", investigator: "Sofia Ramirez",
        status: "closed", report: "completed", review: "approved", enforcement: "completed",
        opening: "2024-03-04", investigation: "2024-03-18", closing: "2024-06-12", enforcementDate: "2024-05-30",
        background: "Client reported a growing volume of counterfeit Aurora Luxe watches appearing across European ports.",
        findings: "3,400 counterfeit units found in two containers; serial numbers did not match client records.",
        remarks: "Recovered goods destroyed under customs supervision.",
        notes: "Destruction certificate filed with customs authority.",
        outcome: "Destruction of goods; no legal proceedings opened.",
      },
      {
        cmg: "CMG-2024-0002", clientRef: "NOR-0456", title: "Knockoff Nordika sneakers on marketplaces",
        type: "Counterfeit", target: "SoleTrade Online", owner: "M. Farouk", location: "Online", city: "Lagos",
        address: null, contact: "sole-trade@example.net", brand: "Nordika", clientName: "Nordika Footwear AB",
        team: "Digital Brand Protection", investigator: "Priya Natarajan", status: "open", report: "in_progress",
        review: "pending_review", enforcement: "pending", opening: "2024-05-14", investigation: "2024-05-20",
        enforcementDate: null, background: "Multiple seller accounts listing counterfeit Nordika footwear at steep discounts.",
        findings: "17 active listings identified across two marketplaces.",
        remarks: "Take-down requests sent; awaiting platform responses.",
        notes: null, outcome: null,
      },
      {
        cmg: "CMG-2024-0003", clientRef: "VLT-2201", title: "Trademark breach on replica handbags",
        type: "Trademark Infringement", target: "Boutique de Replique", owner: "Claire Dubois", location: "Physical store",
        city: "Paris", address: "12 Rue de Rivoli", contact: "+33 1 42 00 11 22", brand: "Velour", clientName: "Velour SAS",
        team: "Trademark Enforcement", investigator: "Amelia Osei", status: "pending", report: "draft",
        review: "none", enforcement: "pending", opening: "2024-06-01", investigation: "2024-06-10",
        closing: null, enforcementDate: null, background: "Retail outlet observed selling replica Velour handbags.",
        findings: "Preliminary inspection confirmed in-store counterfeits.",
        remarks: "Awaiting client instructions before raid coordination.",
        notes: null, outcome: null,
      },
      {
        cmg: "CMG-2024-0004", clientRef: "GLD-0098", title: "Fake Goldline cables sold via classified ads",
        type: "Counterfeit", target: "ElectroParts Hub", owner: "D. Mensah", location: "Online", city: "Accra",
        address: null, contact: "d.mensah@eparts.example", brand: "Goldline", clientName: "Goldline Electronics",
        team: "Digital Brand Protection", investigator: "Tom Becker", status: "on_hold", report: "not_started",
        review: "none", enforcement: "none", opening: "2024-06-20", investigation: null, closing: null,
        enforcementDate: null, background: "Suspects identified but jurisdiction unclear.",
        findings: null, remarks: "Hold while legal scope is clarified.",
        notes: "Awaiting external counsel opinion.", outcome: null,
      },
      {
        cmg: "CMG-2024-0005", clientRef: "PHR-3312", title: "Pharma-label counterfeit packaging ring",
        type: "Counterfeit", target: "MediPrint Group", owner: "V. Orlov", location: "Warehouse", city: "Hamburg",
        address: "Unit 9, Industrie Strasse", contact: "v.orlov@mediprint.example", brand: "CuraMed", clientName: "CuraMed Pharma GmbH",
        team: "Counterfeit Goods", investigator: "Marcus Chen", status: "closed", report: "completed", review: "approved",
        enforcement: "completed", opening: "2023-11-08", investigation: "2023-12-02", closing: "2024-04-25",
        enforcementDate: "2024-04-20", background: "Suspected counterfeit packaging for a major pharma brand.",
        findings: "Packaging operation shut down; criminal referral made.",
        remarks: "Case transferred to law enforcement for prosecution.",
        notes: "Internal review completed.", outcome: "Prosecution ongoing under local authorities.",
      },
      {
        cmg: "CMG-2024-0006", clientRef: "LEX-7788", title: "Unlicensed software reseller scheme",
        type: "Copyright Infringement", target: "SoftCopy Ltd.", owner: "A. Tan", location: "Online", city: "Kuala Lumpur",
        address: null, contact: "a.tan@softcopy.example", brand: "VertexSoft", clientName: "Vertex Software Inc.",
        team: "Trademark Enforcement", investigator: "Daniel Kowalski", status: "open", report: "not_started",
        review: "none", enforcement: "none", opening: "2024-07-01", investigation: null, closing: null,
        enforcementDate: null, background: "Reseller distributing cracked VertexSoft licenses.",
        findings: null, remarks: "Evidence collection in progress.",
        notes: null, outcome: null,
      },
      {
        cmg: "CMG-2024-0007", clientRef: "SMB-5511", title: "Counterfeit SolarPeak inverters in distribution",
        type: "Counterfeit", target: "BrightGrid Energy", owner: "P. Okafor", location: "Distribution center", city: "Nairobi",
        address: "Plot 21, Industrial Area", contact: "p.okafor@brightgrid.example", brand: "SolarPeak", clientName: "SolarPeak International",
        team: "Counterfeit Goods", investigator: "Sofia Ramirez", status: "pending", report: "in_progress",
        review: "pending_review", enforcement: "in_progress", opening: "2024-04-10", investigation: "2024-04-22",
        closing: null, enforcementDate: "2024-07-08", background: "Distributor suspected of mixing fake inverters with genuine stock.",
        findings: "200 suspected units quarantined.",
        remarks: "Recall coordinated with distributor.",
        notes: null, outcome: null,
      },
      {
        cmg: "CMG-2024-0008", clientRef: "BLU-9034", title: "BlueOrchid handbags on social commerce",
        type: "Trademark Infringement", target: "StyleDrop Influencer", owner: "K. Vance", location: "Online", city: "Bogota",
        address: null, contact: "@styledrop.example", brand: "BlueOrchid", clientName: "BlueOrchid Fashion House",
        team: "Digital Brand Protection", investigator: "Priya Natarajan", status: "closed", report: "completed",
        review: "reviewed", enforcement: "completed", opening: "2024-01-15", investigation: "2024-01-28",
        closing: "2024-03-02", enforcementDate: "2024-02-20", background: "Influencer promoted counterfeit handbags.",
        findings: "Promotional account removed and listings taken down.",
        remarks: "Public statement issued by client.",
        notes: null, outcome: "Accounts removed; no further action required.",
      },
      {
        cmg: "CMG-2024-0009", clientRef: "KRG-1129", title: "Grey-market KryoGear equipment imports",
        type: "Other", target: "Arctic Sports Ltd.", owner: "T. Solberg", location: "Importer", city: "Oslo",
        address: "Havneveien 3", contact: "t.solberg@arcticsports.example", brand: "KryoGear", clientName: "KryoGear Outdoor",
        team: "Trademark Enforcement", investigator: "Amelia Osei", status: "pending_review", report: "draft",
        review: "pending_review", enforcement: "none", opening: "2024-06-11", investigation: "2024-06-25",
        closing: null, enforcementDate: null, background: "Parallel imports requiring client direction.",
        findings: "Goods confirmed genuine but sold outside authorized channels.",
        remarks: "Draft report under internal review.",
        notes: null, outcome: null,
      },
      {
        cmg: "CMG-2024-0010", clientRef: "TUR-4321", title: "Counterfeit TerraMod furniture showroom",
        type: "Counterfeit", target: "UrbanForm Studio", owner: "L. Marchetti", location: "Showroom", city: "Milan",
        address: "Via Brera 44", contact: "l.marchetti@urbanform.example", brand: "TerraMod", clientName: "TerraMod Design Srl",
        team: "Trademark Enforcement", investigator: "Daniel Kowalski", status: "open", report: "in_progress",
        review: "none", enforcement: "pending", opening: "2024-07-12", investigation: "2024-07-20",
        closing: null, enforcementDate: null, background: "Showroom displaying unauthorized TerraMod replicas.",
        findings: "Site inspection completed; replica furniture photographed.",
        remarks: "Cease & desist being drafted.",
        notes: null, outcome: null,
      },
      {
        cmg: "CMG-2023-0001", clientRef: "ARO-0777", title: "Historic Aurora Luxe counterfeits (closed)",
        type: "Counterfeit", target: "Orient Traders", owner: "S. Chen", location: "Market", city: "Singapore",
        address: "Orchard Market, Unit B12", contact: "s.chen@orienttraders.example", brand: "Aurora Luxe", clientName: "Aurora Timepieces SA",
        team: "Counterfeit Goods", investigator: "Marcus Chen", status: "closed", report: "completed", review: "approved",
        enforcement: "completed", opening: "2023-08-14", investigation: "2023-09-02", closing: "2023-12-18",
        enforcementDate: "2023-12-10", background: "Market stall selling counterfeit timepieces.",
        findings: "Stall closed after enforcement action.",
        remarks: "Closed after successful enforcement.",
        notes: null, outcome: "Stall closure; goods confiscated.",
      },
      {
        cmg: "CMG-2023-0002", clientRef: "VLT-1130", title: "Replica Velour belts at trade fair",
        type: "Trademark Infringement", target: "FashionFair Exhibit 88", owner: "R. Kovač", location: "Exhibition", city: "Berlin",
        address: "Messe Berlin, Hall 3", contact: "r.kovac@ffair.example", brand: "Velour", clientName: "Velour SAS",
        team: "Trademark Enforcement", investigator: "Amelia Osei", status: "closed", report: "completed", review: "reviewed",
        enforcement: "completed", opening: "2023-05-02", investigation: "2023-05-10", closing: "2023-07-01",
        enforcementDate: "2023-06-20", background: "Replica belts displayed at an international trade fair.",
        findings: "Exhibit removed after intervention.",
        remarks: null, notes: null, outcome: "Exhibit shut down.",
      },
      {
        cmg: "CMG-2023-0003", clientRef: "GLD-5522", title: "Goldline charger knockoffs on street market",
        type: "Counterfeit", target: "City Electronics Market", owner: "F. Diallo", location: "Street market", city: "Dakar",
        address: "Marche Sandaga", contact: "f.diallo@citymarket.example", brand: "Goldline", clientName: "Goldline Electronics",
        team: "Counterfeit Goods", investigator: "Sofia Ramirez", status: "closed", report: "completed", review: "approved",
        enforcement: "completed", opening: "2023-03-20", investigation: "2023-04-05", closing: "2023-06-15",
        enforcementDate: "2023-06-10", background: "Street vendors selling hazardous counterfeit chargers.",
        findings: "Chargers seized due to fire safety risk.",
        remarks: null, notes: null, outcome: "Goods destroyed.",
      },
      {
        cmg: "CMG-2024-0011", clientRef: "KRY-2209", title: "Fake KryoGear tents for expedition market",
        type: "Counterfeit", target: "Alpine Supply Co.", owner: "J. Lindqvist", location: "Online", city: "Stockholm",
        address: null, contact: "j.lindqvist@alpinesupply.example", brand: "KryoGear", clientName: "KryoGear Outdoor",
        team: "Digital Brand Protection", investigator: "Tom Becker", status: "open", report: "not_started",
        review: "none", enforcement: "none", opening: "2024-07-18", investigation: null, closing: null,
        enforcementDate: null, background: "Suspected replica tents on a specialist marketplace.",
        findings: null, remarks: "Initial triage complete.",
        notes: null, outcome: null,
      },
      {
        cmg: "CMG-2024-0012", clientRef: "SMB-6033", title: "SolarPeak panel decal forgery",
        type: "Counterfeit", target: "Renova Installations", owner: "G. Petrova", location: "Installer", city: "Sofia",
        address: "ul. Industriaina 7", contact: "g.petrova@renova.example", brand: "SolarPeak", clientName: "SolarPeak International",
        team: "Trademark Enforcement", investigator: "Daniel Kowalski", status: "pending_review", report: "draft",
        review: "pending_review", enforcement: "pending", opening: "2024-05-30", investigation: "2024-06-12",
        closing: null, enforcementDate: null, background: "Installer applying forged branding decals to third-party panels.",
        findings: "Forged decals confirmed in storage.",
        remarks: "Report ready; pending supervisor review.",
        notes: null, outcome: null,
      },
      {
        cmg: "CMG-2024-0013", clientRef: "NOR-8817", title: "Nordika apparel counterfeits at bazaar",
        type: "Counterfeit", target: "Grand Bazaar Stall 9", owner: "H. Yilmaz", location: "Bazaar", city: "Istanbul",
        address: "Kapalıçarşı, Stall 9", contact: "h.yilmaz@bazaar.example", brand: "Nordika", clientName: "Nordika Footwear AB",
        team: "Counterfeit Goods", investigator: "Marcus Chen", status: "open", report: "in_progress",
        review: "none", enforcement: "pending", opening: "2024-07-22", investigation: "2024-07-30",
        closing: null, enforcementDate: null, background: "Stall offering counterfeit apparel.",
        findings: "Photo evidence gathered.",
        remarks: "Coordination with local authorities scheduled.",
        notes: null, outcome: null,
      },
    ];

    const caseIds: Record<string, number> = {};
    for (const c of cases) {
      const r = await client.query(
        `INSERT INTO cases (
           cmg_reference, client_reference, title, case_type,
           target_name, target_owner, location, city, address, contact_info,
           brand, client, team_id, investigator_id,
           status, report_status, review_status, enforcement_status,
           case_opening_date, investigation_date, closing_date, enforcement_date,
           background, findings, remarks, notes, outcome,
           created_by
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
           $19,$20,$21,$22,$23,$24,$25,$26,$27,$28
         ) RETURNING id`,
        [
          c.cmg, c.clientRef, c.title, c.type,
          c.target, c.owner, c.location, c.city, c.address, c.contact,
          c.brand, c.clientName, teamIds[c.team], investigatorIds[c.investigator],
          c.status, c.report, c.review, c.enforcement,
          c.opening, c.investigation, c.closing, c.enforcementDate,
          c.background, c.findings, c.remarks, c.notes, c.outcome,
          userIds["Alex Carter"],
        ]
      );
      caseIds[c.cmg] = r.rows[0].id;
    }

    // -------------------------------------------------------------
    // REMARKS (append-only history)
    // -------------------------------------------------------------
    const remarks = [
      ["CMG-2024-0001", "Alex Carter", "update", "Goods confirmed counterfeit; report filed."],
      ["CMG-2024-0001", "Sofia Ramirez", "resolution", "Destruction completed under customs supervision."],
      ["CMG-2024-0002", "Priya Natarajan", "update", "Seller accounts re-registered after first take-downs."],
      ["CMG-2024-0002", "Priya Natarajan", "follow_up", "Second round of take-downs requested."],
      ["CMG-2024-0003", "Amelia Osei", "update", "Store visit scheduled."],
      ["CMG-2024-0005", "Marcus Chen", "escalation", "Referral made to local law enforcement."],
      ["CMG-2024-0007", "Sofia Ramirez", "update", "Quarantine count revised to 200 units."],
      ["CMG-2024-0008", "Priya Natarajan", "resolution", "Accounts removed; client satisfied."],
      ["CMG-2024-0010", "Daniel Kowalski", "follow_up", "Awaiting legal drafting of cease & desist."],
    ];
    for (const [cmg, user, type, comment] of remarks) {
      await client.query(
        `INSERT INTO remarks (case_id, user_id, comment, type, created_at)
         VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 day')`,
        [caseIds[cmg], userIds[user], comment, type]
      );
    }

    // -------------------------------------------------------------
    // REVIEWS (append-only history)
    // -------------------------------------------------------------
    const reviews = [
      ["CMG-2024-0001", "Yusuf Demir", "approved", "Report quality excellent; approved for submission.", "2024-06-10"],
      ["CMG-2024-0002", "Yusuf Demir", "pending_review", "Pending marketplace evidence update.", "2024-07-15"],
      ["CMG-2024-0005", "Yusuf Demir", "approved", "Criminal referral documented correctly.", "2024-04-22"],
      ["CMG-2024-0008", "Yusuf Demir", "reviewed", "Reviewed; external statement verified.", "2024-03-01"],
      ["CMG-2024-0009", "Yusuf Demir", "pending_review", "Awaiting client policy confirmation.", "2024-07-05"],
      ["CMG-2024-0012", "Yusuf Demir", "pending_review", "Pending supervisor sign-off.", "2024-07-14"],
    ];
    for (const [cmg, reviewer, status, comment, date] of reviews) {
      await client.query(
        `INSERT INTO reviews (case_id, reviewer_id, review_comment, review_status, reviewed_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [caseIds[cmg], userIds[reviewer], comment, status, date]
      );
    }

    // -------------------------------------------------------------
    // ACTIVITY LOGS (complete timeline)
    // -------------------------------------------------------------
    const activities: [string, string, string, string][] = [
      ["CMG-2024-0001", "Alex Carter", "case_created", "Case created with reference CMG-2024-0001"],
      ["CMG-2024-0001", "Sofia Ramirez", "investigator_assigned", "Sofia Ramirez assigned as investigator"],
      ["CMG-2024-0001", "Sofia Ramirez", "remark_added", "Goods confirmed counterfeit; report filed"],
      ["CMG-2024-0001", "Sofia Ramirez", "status_changed", "Status changed from open to closed"],
      ["CMG-2024-0002", "Alex Carter", "case_created", "Case created with reference CMG-2024-0002"],
      ["CMG-2024-0002", "Priya Natarajan", "investigator_assigned", "Priya Natarajan assigned as investigator"],
      ["CMG-2024-0002", "Priya Natarajan", "remark_added", "Take-down requests sent"],
      ["CMG-2024-0002", "Priya Natarajan", "review_added", "Review added by Yusuf Demir"],
      ["CMG-2024-0003", "Alex Carter", "case_created", "Case created with reference CMG-2024-0003"],
      ["CMG-2024-0005", "Alex Carter", "case_created", "Case created with reference CMG-2024-0005"],
      ["CMG-2024-0005", "Marcus Chen", "document_uploaded", "Destruction certificate uploaded"],
      ["CMG-2024-0005", "Marcus Chen", "case_closed", "Case closed after enforcement completed"],
      ["CMG-2024-0008", "Alex Carter", "case_created", "Case created with reference CMG-2024-0008"],
      ["CMG-2024-0008", "Priya Natarajan", "case_closed", "Case closed; accounts removed"],
      ["CMG-2024-0009", "Alex Carter", "case_created", "Case created with reference CMG-2024-0009"],
      ["CMG-2024-0009", "Amelia Osei", "status_changed", "Status changed from open to pending_review"],
      ["CMG-2024-0012", "Alex Carter", "case_created", "Case created with reference CMG-2024-0012"],
      ["CMG-2024-0012", "Daniel Kowalski", "status_changed", "Status changed from pending to pending_review"],
    ];
    for (const [cmg, user, action, description] of activities) {
      await client.query(
        `INSERT INTO activity_logs (case_id, user_id, action, description)
         VALUES ($1, $2, $3, $4)`,
        [caseIds[cmg], userIds[user], action, description]
      );
    }

    // -------------------------------------------------------------
    // DOCUMENTS
    // -------------------------------------------------------------
    const documents = [
      ["CMG-2024-0001", "Destruction certificate", "pdf", "DOC-AUR-2024-118", "files/destruction-cert-cmg0001.pdf"],
      ["CMG-2024-0001", "Customs report", "pdf", "DOC-AUR-2024-119", "files/customs-report-cmg0001.pdf"],
      ["CMG-2024-0002", "Listing screenshots", "zip", "EVID-SOL-2024-221", "files/listings-screenshots-cmg0002.zip"],
      ["CMG-2024-0005", "Prosecution referral", "pdf", "DOC-CUR-2024-042", "files/referral-cmg0005.pdf"],
      ["CMG-2024-0008", "Take-down confirmation", "pdf", "DOC-BLU-2024-087", "files/takedown-confirm-cmg0008.pdf"],
    ];
    for (const [cmg, name, fileType, reference, filePath] of documents) {
      await client.query(
        `INSERT INTO case_documents (case_id, name, description, file_type, reference, file_path, uploaded_by)
         VALUES ($1, $2, 'Imported reference document', $3, $4, $5, $6)`,
        [caseIds[cmg], name, fileType, reference, filePath, userIds["Alex Carter"]]
      );
    }

    await client.query("COMMIT");

    const counts = await client.query(
      `SELECT
         (SELECT count(*) FROM teams) AS teams,
         (SELECT count(*) FROM investigators) AS investigators,
         (SELECT count(*) FROM users) AS users,
         (SELECT count(*) FROM cases) AS cases,
         (SELECT count(*) FROM cases WHERE status = 'open') AS open_cases,
         (SELECT count(*) FROM cases WHERE status = 'closed') AS closed_cases,
         (SELECT count(*) FROM cases WHERE status = 'pending') AS pending_cases,
         (SELECT count(*) FROM cases WHERE status = 'pending_review') AS pending_review_cases,
         (SELECT count(*) FROM cases WHERE status = 'on_hold') AS on_hold_cases,
         (SELECT count(*) FROM remarks) AS remarks,
         (SELECT count(*) FROM reviews) AS reviews,
         (SELECT count(*) FROM activity_logs) AS activity_logs,
         (SELECT count(*) FROM case_documents) AS documents`
    );
    console.log("Seed complete:");
    console.log(counts.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await db.end();
  }
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});