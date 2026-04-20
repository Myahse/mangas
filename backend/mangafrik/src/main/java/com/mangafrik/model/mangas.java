package com.mangafrik.model;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import com.mangafrik.model.BaseEntity;
import java.util.UUID;

@Entity
@Table(name = "mangas")
public class Mangas extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private String uuid;
    @Override
    public String getUuid() {
        return uuid;
    }
    @Override
    public void setUuid(String uuid) {
        this.uuid = UUID.randomUUID().toString();
        }
    @Column(name = "title", nullable = false)
    private String title;
    @Column(name = "slug", nullable = false)
    private String slug;
    @Column(name = "author", nullable = false)
    private String author;
    @Column(name = "artist", nullable = false)
    private String artist;
    @Column(name = "cover", nullable = false)
    private String cover;
    @Column(name = "banner", nullable = false)
    private String banner;
    @Column(name = "heroCover", nullable = false)
    private String heroCover;
    @Column(name = "genres", nullable = false)
    private String genres;
    @Column(name = "rating", nullable = false)
    private String rating;
    @Column(name = "totalChapters", nullable = false)
    private String totalChapters;
    @Column(name = "latestChapter", nullable = false)
    private String latestChapter;
    @Column(name = "status", nullable = false)
    private String status;
    @Column(name = "views", nullable = false)
    private String views;
    @Column(name = "synopsis", nullable = false)
    private String synopsis;
    @Column(name = "featured", nullable = false)
    private String featured;
    @Column(name = "year", nullable = false)
    private String year;
    @Column(name = "localChapters", nullable = false)
    private String localChapters;
}